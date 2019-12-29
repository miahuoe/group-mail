const base64 = require("../../services/imap");
const { imap, connect } = require("../../services/imap");
const mimemessage = require("mimemessage");
const fs = require("fs");

const read = (filepath) => {
	return fs.readFileSync(filepath, "utf8");
};

const parseMailStruct = (struct, parts) => {
	parts = parts || [];
	for (s of struct) {
		if (Array.isArray(s)) {
			parseMailStruct(s, parts);
		} else {
			if (s.partID) {
				//if (s.disposition && ["INLINE", "ATTACHMENT"].includes(s.disposition.type)) {
				parts.push(s);
			}
		}
	}
	return parts;
};

const attachmentsFromParts = (parts) => {
	let att = [];
	for (p of parts) {
		if (p.disposition && ["INLINE", "ATTACHMENT"].includes(p.disposition.type)) {
			att.push({
				id: p.partID,
				name: p.params.name || p.disposition.params.filename || p.disposition.params.name,
				size: p.size
			});
		}
	}
	return att;
};

const onceReady = (connection) => {
	return new Promise((resolve, reject) => {
		connection.once("ready", () => {
			resolve(connection);
		});
		connection.once("error", reject);
		connection.once("end", () => {
			//console.log("IMAP end");
		});
		connection.connect();
	});
};

const openBox = (connection, directory) => {
	return new Promise((resolve, reject) => {
		connection.openBox(directory, true, (err, box) => {
			if (err) {
				connection.end();
				reject(err);
			} else {
				resolve({conn: connection, box: box});
			}
		});
	});
};

const fetchMeta = (conn, which) => {
	return new Promise((resolve, reject) => {
		let meta = [];
		let header, attrs;
		let f = conn.fetch(which, {
			bodies: ["HEADER.FIELDS (FROM TO SUBJECT DATE)"],
			struct: true
		});
		f.on("message", (msg, seqno) => {
			msg.on("body", (stream, info) => {
				let buffer = "";
				stream.on("data", (chunk) => {
					buffer += chunk.toString("utf8");
				});
				stream.once("end", () => {
					header = imap.parseHeader(buffer);
				});
			});
			msg.once("attributes", (a) => {
				attrs = a;
			});
			msg.once("end", () => {
				meta.push({
					header: header,
					attrs: attrs
				});
			});
			msg.once("error", (err) => {
				reject(err);
				conn.end();
			});
		});
		f.once("error", (err) => {
			reject(err);
			conn.end();
		});
		f.once("end", () => {
			if (meta.length == 0) {
				reject("No such message");
			} else {
				resolve(meta);
			}
		});
	});
};

const fetchPart = (conn, uid, partID) => {
	return new Promise((resolve, reject) => {
		let data = "";
		let f = conn.fetch(uid, {
			bodies: [partID],
			struct: true
		});
		f.on("message", (msg, seqno) => {
			msg.on("body", (stream, info) => {
				let buffer = "";
				stream.on("data", (chunk) => {
					buffer += chunk.toString("utf8");
				});
				stream.once("end", () => {
					data = buffer;
				});
			});
			msg.on("error", (err) => {
				reject(err);
				conn.end();
			});
			msg.once("end", () => {});
		});
		f.once("error", (err) => {
			reject(err);
			conn.end();
		});
		f.once("end", () => {
			resolve(data);
		});
	});
};

const appendMessage = (conn, mail, attachments) => {
	return new Promise((resolve, reject) => {
		const msg = mimemessage.factory({
			contentType: "multipart/alternate",
			body: []
		});
		if (!Array.isArray(mail.recipients)) {
			mail.recipients = [mail.recipients]
		}
		msg.header("To", mail.recipients.join(", "));
		// TODO from
		// TODO date not showing
		msg.header("Subject", mail.subject);
		const plainEntity = mimemessage.factory({
			body: mail.body
		});
		msg.body.push(plainEntity);
		for (a of attachments) {
			const att = mimemessage.factory({
				body: read(a.path),
			});
			att.header("Content-Disposition", `ATTACHMENT ;filename=\"${a.originalname}\"`);
			msg.body.push(att);
		}
		const options = {
			//mailbox: directory,
		};
		conn.append(msg.toString(), options, (err) => {
			if (err) {
				reject(err);
			} else {
				resolve(mail) // TODO ID???
			}
		});
	});
};

const addMessage = (conn, directory, mail, attachments) => {
	return new Promise((resolve, reject) => {
		onceReady(conn)
		.then((conn) => openBox(conn, directory))
		.then((cb) => {
			appendMessage(cb.conn, mail, attachments)
			.then(resolve).catch(reject);
		});
	});
};

const addAttachment = (conn, directory, mailId, attachment) => {
	return new Promise((resolve, reject) => {
		onceReady(conn)
		.then((conn) => openBox(conn, directory))
		.then(async (cb) => {
			const meta = await fetchMeta(cb.conn, ""+mailId);
			return {
				meta: meta[0],
				conn: cb.conn,
			};
		}).then((mc) => {
			const parts = parseMailStruct(mc.meta.attrs.struct);
			const att = attachmentsFromParts(parts);
			let attachments = [attachment];
			appendMessage(mc.conn, {
				subject: "test subject",
				recipients: ["test recipient"],
				body: "test body",
			}, attachments).then(resolve).catch(reject);
		}).catch(reject)
		.finally(() => {
			conn.end();
		});
	});
};

const getPart = (conn, directory, uid, partid) => {
	return new Promise((resolve, reject) => {
		onceReady(conn)
		.then((conn) => openBox(conn, directory))
		.then((cb) => {
			fetchMeta(cb.conn, uid)
			.then((meta) => {
				fetchPart(cb.conn, uid, partid)
				.then(resolve)
				.catch((e) => reject("No such attachment"));
			}).catch((e) => reject("No such message"));
		});
	});
}

const getMessages = (conn, directory, offset, limit) => {
	return new Promise((resolve, reject) => {
		onceReady(conn)
			.then((conn) => openBox(conn, directory))
			.then((cb) => {
				if (cb.box.messages.total == 0) {
					return undefined;
				}
				return fetchMeta(cb.conn, "1:*")
			}).then((meta) => {
				if (!meta) {
					resolve([]);
					return;
				}
				meta.reverse();
				let mail = [];
				let begin = offset;
				let end = offset+limit;
				if (begin >= meta.length) {
					begin = meta.length-1;
				}
				if (end >= meta.length) {
					end = meta.length;
				}
				for (i = begin; i < end; i++) {
					const m = meta[i];
					const parts = parseMailStruct(m.attrs.struct);
					const att = attachmentsFromParts(parts);
					//const body = await fetchPart(conn, m.attrs.uid, "1"); // TODO
					const body = ""; // TODO base64
					mail.push({
						id: m.attrs.uid,
						subject: m.header.subject?m.header.subject[0]:"",
						from: m.header.from?m.header.from[0]:"", // TODO
						to: m.header.to?m.header.to[0]:"", // TODO
						date: m.header.date?m.header.date[0]:"",
						//body: body,
						attachments: att
					});
				}
				resolve(mail);
			}).catch((err) => {
				console.log(err); // TODO
			});
	});
}

const deleteMessage = (conn, directory, id) => {
	return new Promise((resolve, reject) => {
		onceReady(conn)
		.then((conn) => openBox(conn, directory))
		.then((cb) => {
			cb.conn.addFlags(id, "Deleted", (err) => {
				if (err) {
					reject(err);
				} else {
					resolve();
				}
			});
		});
	});
};


module.exports = {
	getPart, getMessages, addMessage, deleteMessage,
	addAttachment,
};

// vim:noai:ts=4:sw=4
