const base64 = require("../../services/imap");
const { imap, connect } = require("../../services/imap");

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
		});
		f.once("error", (err) => {
			reject(err);
			conn.end();
		});
		f.once("end", () => {
			resolve(meta);
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

const getSeqFromDirectory = (conn, directory, sequence) => {
	return new Promise((resolve, reject) => {
		onceReady(conn)
		.then((conn) => openBox(conn, directory))
		.then((conn, box) => fetchMeta(conn, sequence))
		.then(async (meta) => {
			let mail = [];
			for (m of meta) {
				const parts = parseMailStruct(m.attrs.struct);
				const att = attachmentsFromParts(parts);
				const body = await fetchPart(conn, m.attrs.uid, "1.2"); // TODO
				mail.push({
					id: m.attrs.uid,
					title: m.header.subject[0],
					from: m.header.from[0], // TODO
					to: m.header.from[0], // TODO
					date: m.header.date[0],
					body: body,
					attachments: att
				});
			}
			resolve(mail);
		});
	});
}

const getMailFromDirectory = (conn, directory, offset, limit) => {
	return new Promise((resolve, reject) => {
		onceReady(conn)
		.then((conn) => openBox(conn, directory))
		.then((cb) => fetchMeta(cb.conn, cb.box.messages.total+":*"))
		.then(async (meta) => {
			let mail = [];
			let begin = offset;
			let end = offset+limit;
			if (begin >= meta.length) {
				begin = meta.length-1;
			}
			if (end >= meta.length) {
				end = meta.length;
			}
			for (i = end-1; i >= begin; i--) {
				const m = meta[i];
				console.log(m);
				const parts = parseMailStruct(m.attrs.struct);
				const att = attachmentsFromParts(parts);
				//const body = await fetchPart(conn, m.attrs.uid, "1.2"); // TODO
				const body = ""; // TODO
				mail.push({
					id: m.attrs.uid,
					title: m.header.subject[0],
					from: m.header.from[0], // TODO
					to: m.header.from[0], // TODO
					date: m.header.date[0],
					body: body,
					attachments: att
				});
			}
			resolve(mail);
		}).catch(reject);
	});
}

module.exports = {
	getMailFromDirectory
};

// vim:noai:ts=4:sw=4
