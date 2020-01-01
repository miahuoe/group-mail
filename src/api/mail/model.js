const base64 = require("../../services/imap");
const { imap, connect } = require("../../services/imap");
const mimemessage = require("mimemessage");
const fs = require("fs");
const { HTTPError } = require("../../lib/HTTPError");

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
			let a = {
				id: p.partID,
				name: "",
				size: p.size
			};
			if (p.params && p.params.name) {
				a.name = p.params.name;
			} else {
				a.name = p.disposition.params.filename || p.disposition.params.name;
			}
			att.push(a);
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
		connection.openBox(directory, false, (err, box) => {
			if (err) {
				connection.end();
				reject(err);
			} else {
				resolve({conn: connection, box: box});
			}
		});
	});
};

const searchIds = (conn, query) => {
	return new Promise((resolve, reject) => {
		conn.search(["ALL", ["TEXT", query]], (err, results) => {
			if (err) {
				reject(err);
			} else {
				resolve(results);
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
				reject(new HTTPError(404, "No such message"));
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
				stream.once("end", () => {
					resolve(buffer);
				});
				stream.on("data", (chunk) => {
					buffer += chunk.toString("utf8");
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
		f.once("end", () => {});
	});
};

const appendMessage = (conn, mail, attachments) => {
	return new Promise((resolve, reject) => {
		const msg = mimemessage.factory({
			contentType: "multipart/alternate",
			body: []
		});
		if (!Array.isArray(mail.to)) {
			mail.to = [mail.to]
		}
		msg.header("To", mail.to.join(", "));
		msg.header("From", mail.from);
		msg.header("Date", (new Date()).toISOString());
		msg.header("Subject", mail.subject);
		msg.header("X-UID", 666);
		const plainEntity = mimemessage.factory({
			body: mail.body
		});
		msg.body.push(plainEntity);
		for (a of attachments) {
			const att = mimemessage.factory({
				contentType: "application/octet-stream",
				contentTransferEncoding: "base64",
				body: a.buffer.toString("base64"),
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
	return onceReady(conn)
	.then((conn) => openBox(conn, directory))
	.then((cb) => appendMessage(cb.conn, mail, attachments));
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
			const mail = {
				from: mc.meta.header.from,
				to: mc.meta.header.to,
				subject: mc.meta.header.subject
			};
			return appendMessage(mc.conn, mail, attachments)
			.then(() => markDeleted(mc.conn, [mailId]));
		}).catch(reject)
		.finally(() => {
			conn.end();
			resolve();
		});
	});
};

const getPart = (conn, directory, uid, partid) => {
	return new Promise((resolve, reject) => {
		onceReady(conn)
		.then((conn) => openBox(conn, directory))
		.then((cb) => {
			fetchMeta(cb.conn, uid)
			.then(async (meta) => {
				meta = meta[0];
				const part = await fetchPart(cb.conn, uid, partid);
				if (!part) reject(new HTTPError(404, "No such attachment"));
				const partInfo = parseMailStruct(meta.attrs.struct);
				const thisPart = partInfo.find(i => i.partID == partid);
				resolve(Buffer.from(part, thisPart.encoding));
			}).catch((e) => reject(new HTTPError(404, "No such message")));
		});
	});
}

const getMessages = (conn, directory, query, offset, limit) => {
	return onceReady(conn)
	.then((conn) => openBox(conn, directory))
	.then(async (cb) => {
		if (cb.box.messages.total == 0) {
			return undefined;
		}
		if (query) {
			const seqs = await searchIds(conn, query);
			return fetchMeta(cb.conn, seqs);
		} else {
			return fetchMeta(cb.conn, "1:*");
		}
	}).then((meta) => {
		if (!meta) {
			return [];
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
			//const body = "";
			mail.push({
				id: m.attrs.uid,
				subject: m.header.subject?m.header.subject[0]:"",
				from: m.header.from?m.header.from[0]:"", // TODO
				to: m.header.to?m.header.to[0]:"", // TODO
				date: m.header.date?m.header.date[0]:"",
				attachments: att
			});
		}
		return mail;
	})
}

const markDeleted = (conn, uids) => {
	return new Promise((resolve, reject) => {
		conn.setFlags(uids, "Deleted", (err) => {
			if (err) {
				reject(err);
			} else {
				conn.expunge((err) => {
					if (err) {
						reject(err);
					} else {
						resolve();
					}
				});
			}
		});
	});
};

const deleteMessage = (conn, directory, uid) => {
	return onceReady(conn)
	.then((conn) => openBox(conn, directory))
	.then((cb) => markDeleted(conn, [uid]));
};

const deleteAttachment = (conn, directory, uid, aid) => {
	return Promise.reject(new HTTPError(501, "Not implemented"));
};

module.exports = {
	getPart, getMessages, addMessage, deleteMessage,
	addAttachment, deleteAttachment
};

// vim:noai:ts=4:sw=4
