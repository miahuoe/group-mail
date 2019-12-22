const base64 = require("../../services/imap");
const { imap, connect } = require("../../services/imap");
const mimemessage = require("mimemessage");

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
				name: p.params.name,
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

const addMessage = (conn, directory, mail) => {
	return new Promise((resolve, reject) => {
		onceReady(conn)
		.then((conn) => openBox(conn, directory)).then((cb) => {
			const msg = mimemessage.factory({
				contentType: "multipart/alternate",
				body: []
			});
			const plainEntity = mimemessage.factory({
				body: mail.body
			});
			if (!Array.isArray(mail.recipients)) {
				mail.recipients = [mail.recipients]
			}
			msg.header("To", mail.recipients.join(", "));
			// TODO from
			// TODO date not showing
			msg.header("Subject", mail.subject);
			msg.body.push(plainEntity);
			cb.conn.append(msg.toString(), {
				mailbox: directory,
			}, reject);
			resolve({todo: "respond with mail"}); // TODO respond with mail
		}).catch(reject);
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
		}).then(async (meta) => {
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
					title: m.header.subject?m.header.subject[0]:"",
					from: m.header.from?m.header.from[0]:"", // TODO
					to: m.header.to?m.header.to[0]:"", // TODO
					date: m.header.date?m.header.date[0]:"",
					//body: body,
					attachments: att
				});
			}
			resolve(mail);
		}).catch((err) => {
			console.log(err);
		});
	});
}

const deleteMessage = (conn, directory, id) => {
	return new Promise((resolve, reject) => {
		onceReady(conn)
		.then((conn) => openBox(conn, directory))
		.then((cb) => {
			const conn = cb.conn;
			//const box = cb.box;
			conn.addFlags(id, "Deleted", (err) => {
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
	getPart, getMessages, addMessage, deleteMessage
};

// vim:noai:ts=4:sw=4
