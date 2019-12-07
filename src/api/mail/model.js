const { imap, connect } = require("../../services/imap");

const parseMailStruct = (struct, attachments) => {
	attachments = attachments || [];
	for (s of struct) {
		if (Array.isArray(s)) {
			parseMailStruct(s, attachments);
		} else {
			if (s.disposition && ["INLINE", "ATTACHMENT"].includes(s.disposition.type)) {
				attachments.push({
					id: parseInt(s.partID),
					name: s.params.name,
					size: s.size,
				});
			}
		}
	}
	return attachments;
};

const getMailFromDirectory = (i, directory, sequence) => {
	return new Promise((resolve, reject) => {
		let mail = []
		i.once("ready", () => {
			i.openBox(directory, true, (err, box) => {
				// TODO check presistent UID
				if (err) reject(err);
				//console.log(box);
				let f = i.fetch(sequence(box.messages.total, box.uidnext), {
					bodies: ["HEADER.FIELDS (FROM TO SUBJECT DATE)", "TEXT"],
					// TODO fetch header first, then parse body for attachments
					struct: true
				});
				let body, header, uid, date, struct;
				f.on("message", (msg, seqno) => {
					msg.on("body", (stream, info) => {
						let buffer = "";
						stream.on("data", (chunk) => {
						  buffer += chunk.toString("utf8");
						});
						stream.once("end", () => {
							switch (info.which) {
							case "TEXT":
								body = buffer;
								break;
							default:
								header = imap.parseHeader(buffer);
								break;
							}
						});
					});
					msg.once("attributes", (attrs) => {
						uid = attrs.uid;
						date = attrs.date;
						struct = attrs.struct;
					});
					msg.once("end", () => {
						mail.push({
							id: uid,
							body: body,
							date: date,
							from: header.from,
							to: header.to,
							subject: header.subject[0],
							attachments: parseMailStruct(struct),
						});
					});
				});
				f.once("error", reject);
				f.once("end", () => i.end());
			});
		});
		i.once("error", reject);
		i.once("end", () => resolve(mail));
		i.connect();
	});
}

module.exports = {
	getMailFromDirectory
};

// vim:noai:ts=4:sw=4
