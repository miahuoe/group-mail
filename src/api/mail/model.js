//"use strict"; // TODO
const base64 = require("../../services/imap");
const { imap, connect } = require("../../services/imap");
const mimemessage = require("mimemessage");
const fs = require("fs");
const { HTTPError } = require("../../lib/HTTPError");

// TODO closeBox(cb())

const attachmentFromBuffer = (buffer, name) => {
	let att = mimemessage.factory({
		contentType: "application/octet-stream",
		contentTransferEncoding: "base64",
		body: buffer.toString("base64"),
	});
	att.header("Content-Disposition", `ATTACHMENT ;filename=\"${name}\"`);
	return att;
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
			let a = {
				id: parseInt(p.partID),
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

const mailPrototypeToMimeMessage = (mail) => {
	const msg = mimemessage.factory({
		contentType: "multipart/alternate",
		body: []
	});
	if (!Array.isArray(mail.to)) {
		mail.to = [mail.to];
	}
	mail.date = (new Date()).toISOString();
	msg.header("To", mail.to.join(", "));
	msg.header("From", mail.from);
	msg.header("Date", mail.date); // TODO
	msg.header("Subject", mail.subject);
	if (mail.body) {
		const plainEntity = mimemessage.factory({
			body: mail.body
		});
		msg.body.push(plainEntity);
	}
	return msg;
};

const metaToMailPrototype = (meta) => {
	const parts = parseMailStruct(meta.attrs.struct);
	const att = attachmentsFromParts(parts);
	return {
		id: meta.attrs.uid,
		subject: meta.header.subject?meta.header.subject[0]:"",
		from: meta.header.from?meta.header.from[0]:"", // TODO
		to: meta.header.to?meta.header.to[0]:"", // TODO
		date: meta.header.date?meta.header.date[0]:"",
		attachments: att
	};
};

const onceReady = (conn) => {
	return new Promise((resolve, reject) => {
		conn.once("ready", () => {
			resolve(conn);
		});
		conn.once("error", (err) => {
			conn.end();
			reject(err);
		});
		conn.once("end", () => {
			//console.log("IMAP end");
		});
		conn.connect();
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
				if (info.size == 0) {
					resolve(undefined); // TODO add checks
					return;
				}
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

const newMessage = (conn, mail) => {
	return new Promise((resolve, reject) => {
		let msg = mailPrototypeToMimeMessage(mail);
		const options = {};
		conn.append(msg.toString(), options, async (err) => {
			if (err) {
				reject(err);
			} else {
				const ids = await search(conn, [
					"RECENT",
					["HEADER", "SUBJECT", mail.subject],
					["HEADER", "FROM", mail.from]
					// TODO
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

const cloneMessage = (conn, uid, mail, newAtt, excludeAttachments = []) => {
	return new Promise(async (resolve, reject) => {
		let msg = mailPrototypeToMimeMessage(mail);
		if (newAtt) {
			msg.body.push(attachmentFromBuffer(newAtt.buffer, newAtt.originalname));
		}
		const meta = await fetchMeta(conn, uid);
		const parts = parseMailStruct(meta[0].attrs.struct);
		for (a of attachmentsFromParts(parts)) {
			if (excludeAttachments.includes(a.id)) {
				continue;
			}
			const buffer = await fetchPart(conn, uid, a.id);
			if (buffer) {
				msg.body.push(attachmentFromBuffer(buffer, a.name));
			}
		}
		const options = {};
		conn.append(msg.toString(), options, async (err) => {
			if (err) {
				reject(err);
			} else {
				const ids = await search(conn, [
					"RECENT",
					["HEADER", "SUBJECT", mail.subject],
					["HEADER", "FROM", mail.from]
					// TODO
				]);
				if (ids && ids.length == 1) {
					mail.id = ids[0];
				} else {
					console.warn("did not find an id");
					// TODO
				}
				const meta = await fetchMeta(conn, mail.id);
				const parts = parseMailStruct(meta[0].attrs.struct);
				mail.attachments = attachmentsFromParts(parts);
				resolve(mail);
			}
		});
	});
};

const addMessage = async (conn, directory, mail, newAttachments) => {
	const box = await openBox(conn, directory);
	return newMessage(conn, mail).finally(() => {
		conn.closeBox((err) => {}); // TODO
		conn.end();
	});
};

const updateMessage = async (conn, directory, mailId, mail) => {
	const box = await openBox(conn, directory);
	// TODO body?
	return cloneMessage(conn, mailId, mail)
	.then(async (msg) => {
		await markDeleted(conn, [mailId])
		return msg;
	}).finally(() => {
		conn.closeBox((err) => {}); // TODO
		conn.end();
	});
};

const addAttachment = async (conn, directory, mailId, newAttachment) => {
	const box = await openBox(conn, directory);
	let meta = await fetchMeta(conn, mailId);
	meta = meta[0];
	//const parts = parseMailStruct(meta[0].attrs.struct);
	//const att = attachmentsFromParts(parts);
	const body = await fetchPart(conn, mailId, 1);
	const mail = {
		from: meta.header.from,
		to: meta.header.to,
		subject: meta.header.subject,
		body: body ? body.toString() : undefined,
	};
	return cloneMessage(conn, mailId, mail, newAttachment)
	.then(async (msg) => {
		await markDeleted(conn, [mailId])
		return msg;
	}).finally(() => {
		conn.closeBox(() => {});
		conn.end();
	});
};

const getPart = (conn, directory, uid, partid) => {
	return new Promise(async (resolve, reject) => {
		const box = await openBox(conn, directory);
		fetchMeta(conn, uid).then(async (meta) => {
			if (!meta || meta.length == 0) {
				reject(new HTTPError(404, "No such message"));
				return;
			}
			meta = meta[0];
			const partInfo = parseMailStruct(meta.attrs.struct);
			const part = await fetchPart(conn, uid, partid);
			const thisPart = partInfo.find(i => i.partID == partid);
			if (!part) {
				reject(new HTTPError(404, "No such attachment"));
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
			mail.push(metaToMailPrototype(meta[i]));
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

const deleteAttachment = async (conn, directory, uid, aid) => {
	const box = await openBox(conn, directory);
	const meta = await fetchMeta(conn, uid);
	let msg = metaToMailPrototype(meta[0]);
	const body = await fetchPart(conn, uid, 1);
	msg.body = body.toString(); // TODO encoding
	return cloneMessage(conn, uid, msg, undefined, [aid])
	.then(async (msg) => {
		await markDeleted(conn, [uid]);
		return msg;
	}).finally(() => {
		conn.closeBox((err) => {}); // TODO
		conn.end();
	});
};

module.exports = {
	getPart, getMessages, addMessage, deleteMessage,
	addAttachment, deleteAttachment, updateMessage
};

// vim:noai:ts=4:sw=4
