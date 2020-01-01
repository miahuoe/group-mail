const base64 = require("../../services/imap");
const { imap, connect } = require("../../services/imap");
const mimemessage = require("mimemessage");
const fs = require("fs");
const { HTTPError } = require("../../lib/HTTPError");

// TODO closeBox(cb())

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
		connection.once("error", (err) => {
			reject(err);
			conn.end();
		});
		connection.once("end", () => {
			//console.log("IMAP end");
		});
		connection.connect();
	});
};

const openBox = (conn, directory) => {
	return new Promise(async (resolve, reject) => {
		await onceReady(conn);
		conn.openBox(directory, false, (err, box) => {
			if (err) {
				connection.end();
				reject(err);
			} else {
				resolve(box);
			}
		});
	});
};

const search = (conn, arg) => {
	return new Promise((resolve, reject) => {
		conn.search(arg, (err, results) => {
			if (err) {
				reject(err);
			} else {
				resolve(results);
			}
		});
	});
};

const searchIds = (conn, query) => {
	return search(conn, ["ALL", ["TEXT", query]]);
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
				conn.end();
				reject(err);
			});
		});
		f.once("error", (err) => {
			conn.end();
			reject(err);
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
				conn.end();
				reject(err);
			});
			msg.once("end", () => {});
		});
		f.once("error", (err) => {
			conn.end();
			reject(err);
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
		mail.created = (new Date()).toISOString();
		msg.header("To", mail.to.join(", "));
		msg.header("From", mail.from);
		msg.header("Date", mail.created); // TODO
		msg.header("Subject", mail.subject);
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
		conn.append(msg.toString(), options, async (err) => {
			if (err) {
				reject(err);
			} else {
				const ids = await search(conn, [
					"RECENT",
					["HEADER", "SUBJECT", mail.subject],
					["HEADER", "FROM", mail.from]
				]);
				if (ids && ids.length == 1) {
					mail.id = ids[0];
				} else {
					console.warn("did not find an id");
					// TODO
				}
				mail.attachments = [];
				resolve(mail);
			}
		});
	});
};

const addMessage = async (conn, directory, mail, attachments) => {
	const box = await openBox(conn, directory);
	return appendMessage(conn, mail, attachments).finally(() => {
		conn.closeBox((err) => {}); // TODO
		conn.end();
	});
};

const updateMessage = async (conn, directory, mailId, mail) => {
	const box = await openBox(conn, directory);
	return appendMessage(conn, mail, [])
	.then(async (msg) => {
		await markDeleted(conn, [mailId]);
		return msg;
	}).finally(() => {
		conn.closeBox((err) => {}); // TODO
		conn.end();
	});
};

const addAttachment = async (conn, directory, mailId, attachment) => {
	const box = await openBox(conn, directory);
	let meta = await fetchMeta(conn, ""+mailId);
	meta = meta[0];
	const parts = parseMailStruct(meta.attrs.struct);
	const att = attachmentsFromParts(parts);
	let attachments = [attachment];
	const mail = {
		from: meta.header.from,
		to: meta.header.to,
		subject: meta.header.subject
	};
	return appendMessage(conn, mail, attachments)
	.then(() => markDeleted(conn, [mailId]))
	.finally(() => {
		conn.closeBox(() => {});
		conn.end();
	});
};

const getPart = (conn, directory, uid, partid) => {
	return new Promise(async (resolve, reject) => {
		const box = await openBox(conn, directory);
		fetchMeta(conn, uid).then(async (meta) => {
			if (!meta || meta.length == 0) {
				throw new HTTPError(404, "No such message")
			}
			meta = meta[0];
			const partInfo = parseMailStruct(meta.attrs.struct);
			const part = await fetchPart(conn, uid, partid);
			const thisPart = partInfo.find(i => i.partID == partid);
			if (!part) {
				throw new HTTPError(404, "No such attachment");
			} else if (thisPart.encoding === "7bit") {
				resolve(Buffer.from(part, "ascii"));
			} else {
				resolve(Buffer.from(part, thisPart.encoding));
			}
		}).finally(() => {
			conn.closeBox(() => {});
			conn.end();
		});
	});
}

const getMessages = async (conn, directory, query, offset, limit) => {
	const box = await openBox(conn, directory);
	if (box.messages.total == 0) {
		conn.closeBox(() => {});
		conn.end();
		return [];
	}
	let seqs = query ? await searchIds(conn, query) : "1:*";
	return fetchMeta(conn, seqs).then((meta) => {
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
	}).finally(() => {
		conn.closeBox(() => {});
		conn.end();
	});
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

const deleteMessage = async (conn, directory, uid) => {
	const box = await openBox(conn, directory);
	return markDeleted(conn, [uid]).finally(() => {
		conn.closeBox(() => {});
		conn.end();
	});
};

const deleteAttachment = (conn, directory, uid, aid) => {
	return Promise.reject(new HTTPError(501, "Not implemented"));
};

module.exports = {
	getPart, getMessages, addMessage, deleteMessage,
	addAttachment, deleteAttachment, updateMessage
};

// vim:noai:ts=4:sw=4
