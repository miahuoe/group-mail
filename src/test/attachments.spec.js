const should = require("should");
const assert = require("assert");
const request = require("supertest");
const app = require("../app");
const fs = require("fs");
const randomString = require("../lib/randomString");

const files = ["doc.yaml", "knexfile.js"];

const createGroup = async () => {
	const user = {
		login: randomString(),
		password: randomString(),
		email: randomString()+"@lolmail.com",
	};
	const group = {
		name: randomString(),
		maillocal: randomString(),
		description: randomString(),
	};
	let token = "";
	let groupId = 0;
	await request(app)
		.post("/api/users/register")
		.send(user)
		.expect(201);
	await request(app)
		.post("/api/users/login")
		.auth(user.login, user.password)
		.expect(200)
		.expect((res) => {
			res.body.should.have.property("token");
			token = res.body.token;
		});
	await request(app)
		.post("/api/groups")
		.set({ Authorization: "Token "+token })
		.send(group)
		.expect(201)
		.expect((res) => {
			res.body.should.have.property("id");
			groupId = res.body.id;
		});
	return [token, groupId];
};

const createMail = async (mail) => {
	const [token, groupId] = await createGroup();
	let mailId = 0;
	if (!mail) {
		mail = {
			subject: randomString(),
			to: [randomString()+"@mail.com"],
			body: randomString(),
		};
	}
	await request(app)
		.post(`/api/groups/${groupId}/mail/Drafts`)
		.set({ Authorization: "Token "+token })
		.send(mail)
		.expect(201)
		.expect((res) => {
			res.body.should.have.property("id");
			res.body.should.have.property("attachments");
			res.body.attachments.should.be.an.array;
			res.body.attachments.should.be.empty;
			mailId = res.body.id;
		});
	return [token, groupId, mailId];
};

describe("attachments", () => {
	describe("POST /api/groups/:id/mail/:dir/messages/:id/attachments", () => {
		let token = "";
		let groupId = 0;
		let mailId = 0;
		before(async (done) => {
			[token, groupId, mailId] = await createMail();
			done();
		});
		it("should 404 on non-existent group", (done) => {
			request(app)
				.post(`/api/groups/${99999999}/mail/Drafts/messages/${mailId}/attachments`)
				.set({ Authorization: "Token "+token })
				.attach("file", files[0], { contentType: "application/octet-stream" })
				.expect(404)
				.end(done);
		});
		it("should 404 on non-existent message", (done) => {
			request(app)
				.post(`/api/groups/${groupId}/mail/Drafts/messages/${9999999}/attachments`)
				.set({ Authorization: "Token "+token })
				.attach("file", files[0], { contentType: "application/octet-stream" })
				.expect(404)
				.end(done);
		});
		it("should post 2 attachments", async (done) => {
			let mailIds = [mailId, 0, 0];
			for (i = 0; i < 2; i++) {
				await request(app)
					.post(`/api/groups/${groupId}/mail/Drafts/messages/${mailIds[i]}/attachments`)
					.set({ Authorization: "Token "+token })
					.attach("file", files[i], { contentType: "application/octet-stream" })
					.expect(201)
					.expect((res) => {
						res.body.should.be.an.object;
						res.body.should.have.property("id");
						mailIds[i+1] = res.body.id;
					});
			}
			done();
		});
		it("should get Drafts folder with one message with 2 attachments", (done) => {
			request(app)
				.get(`/api/groups/${groupId}/mail/Drafts`)
				.set({ Authorization: "Token "+token })
				.expect(200)
				.expect((res) => {
					res.body.should.be.an.array;
					res.body.should.not.be.empty;
					res.body.should.have.length(1);
					res.body[0].should.have.property("id");
					res.body[0].should.have.property("attachments");
					res.body[0].attachments.should.be.an.array;
					res.body[0].attachments.should.have.length(2);
					res.body[0].attachments[0].should.have.property("id");
				})
				.end(done);
		});
	});
	describe("GET /api/groups/:id/mail/:dir/messages/:id/attachments/:id", () => {
		let token = "";
		let groupId = 0;
		let groupId2 = 0;
		let mailId = 0;
		let atts = [];
		const mail = {
			subject: "subject",
			to: ["mail@mail.com"],
			body: "hello imap",
		};
		before(async (done) => {
			[t, groupId2] = await createGroup();
			[token, groupId] = await createGroup();
			await request(app)
				.post(`/api/groups/${groupId}/mail/Drafts`)
				.set({ Authorization: "Token "+token })
				.send(mail)
				.expect(201)
				.expect((res) => {
					res.body.should.have.property("id");
					mailId = res.body.id;
				});
			for (i = 0; i < 2; i++) {
				await request(app)
					.post(`/api/groups/${groupId}/mail/Drafts/messages/${mailId}/attachments`)
					.set({ Authorization: "Token "+token })
					.attach("file", files[i], { contentType: "application/octet-stream" })
					.expect(201)
					.expect((res) => {
						res.body.should.be.an.object;
						res.body.should.have.property("id");
						res.body.should.have.property("attachments");
						mailId = res.body.id;
						atts = res.body.attachments;
					});
			}
			done();
		});
		it("should 400 on groupId other than int", (done) => {
			request(app)
				.get(`/api/groups/hehe/mail/Drafts/messages/${mailId}/attachments/${atts[0].id}`)
				.set({ Authorization: "Token "+token })
				.expect(400)
				.end(done);
		});
		it("should 400 on mailId other than int", (done) => {
			request(app)
				.get(`/api/groups/${groupId}/mail/Drafts/messages/hehe/attachments/${atts[0].id}`)
				.set({ Authorization: "Token "+token })
				.expect(400)
				.end(done);
		});
		it("should 400 on attachmentId other than int", (done) => {
			request(app)
				.get(`/api/groups/${groupId}/mail/Drafts/messages/${mailId}/attachments/hehe`)
				.set({ Authorization: "Token "+token })
				.expect(400)
				.end(done);
		});
		it("should 401 on missing token", (done) => {
			request(app)
				.get(`/api/groups/${9999999}/mail/Drafts/messages/${mailId}/attachments/${atts[0].id}`)
				.expect(401)
				.end(done);
		});
		it("should 401 as non-member of group", (done) => {
			request(app)
				.get(`/api/groups/${groupId2}/mail/Drafts/messages/${mailId}/attachments/${atts[0].id}`)
				.set({ Authorization: "Token "+token })
				.expect(401)
				.end(done);
		});
		it("should 404 for non-existent group", (done) => {
			request(app)
				.get(`/api/groups/${9999999}/mail/Drafts/messages/${mailId}/attachments/${atts[0].id}`)
				.set({ Authorization: "Token "+token })
				.expect(404)
				.end(done);
		});
		it("should 404 for non-existent message", (done) => {
			request(app)
				.get(`/api/groups/${groupId}/mail/Drafts/messages/${99999999}/attachments/${atts[0].id}`)
				.set({ Authorization: "Token "+token })
				.expect(404)
				.end(done);
		});
		it("should 404 for non-existent attachment", (done) => {
			request(app)
				.get(`/api/groups/${groupId}/mail/Drafts/messages/${mailId}/attachments/${999999}`)
				.set({ Authorization: "Token "+token })
				.expect(404)
				.end(done);
		});
		it("should download an attachment", (done) => {
			request(app)
				.get(`/api/groups/${groupId}/mail/Drafts/messages/${mailId}/attachments/${atts[0].id}`)
				.set({ Authorization: "Token "+token })
				.expect(200)
				.expect("Content-Type", "application/octet-stream")
				.expect((res) => {
					const orig = fs.readFileSync(atts[0].name);
					const sent = res.body;
					assert(0 === Buffer.compare(orig, sent));
				})
				.end(done);
		});
		it("should delete 1 attachment", (done) => {
			request(app)
				.del(`/api/groups/${groupId}/mail/Drafts/messages/${mailId}/attachments/${atts[0].id}`)
				.set({ Authorization: "Token "+token })
				//.expect(204)
				.expect(200)
				.expect((res) => {
					res.body.should.be.an.object;
					res.body.should.have.property("id");
				})
				.end(done);
		});
	});

	describe("DELETE /api/groups/:id/mail/:dir/messages/:id/attachments/:id", () => {
		let token = "";
		let groupId = 0;
		let mailId = 0;
		let attId = 0;
		const mail = {
			subject: "subject",
			to: ["mail@mail.com"],
			body: "hello imap",
		};
		before(async (done) => {
			[token, groupId, mailId] = await createMail(mail);
			await request(app)
				.post(`/api/groups/${groupId}/mail/Drafts/messages/${mailId}/attachments`)
				.set({ Authorization: "Token "+token })
				.attach("file", files[0], { contentType: "application/octet-stream" })
				.expect(201)
				.expect((res) => {
					res.body.should.be.an.object;
					res.body.should.have.property("id");
					res.body.should.have.property("attachments");
					res.body.attachments.should.be.an.array;
					res.body.attachments.should.have.length(1);
					res.body.attachments[0].should.have.property("name");
					res.body.attachments[0].name.should.be.equal(files[0]);
					mailId = res.body.id;
					attId = res.body.attachments[0].id;
				});
			await request(app)
				.get(`/api/groups/${groupId}/mail/Drafts/messages/${mailId}/attachments/${attId}`)
				.set({ Authorization: "Token "+token })
				.expect(200)
				.expect("Content-Type", "application/octet-stream")
				.expect((res) => {
					const orig = fs.readFileSync(files[0]);
					const sent = res.body;
					assert(0 === Buffer.compare(orig, sent));
				});
			await request(app)
				.del(`/api/groups/${groupId}/mail/Drafts/messages/${mailId}/attachments/${attId}`)
				.set({ Authorization: "Token "+token })
				//.expect(204)
				.expect(200)
				.expect((res) => {
					res.body.should.be.an.object;
					res.body.should.have.property("id");
					res.body.should.have.property("attachments");
					res.body.attachments.should.be.an.array;
					res.body.attachments.should.be.empty;
					mailId = res.body.id;
				});
			done();
		});

		it("should have left body untouched", async (done) => {
			request(app)
				.get(`/api/groups/${groupId}/mail/Drafts/messages/${mailId}`)
				.set({ Authorization: "Token "+token })
				.expect(200)
				.expect(mail.body)
				.expect((res) => {
					res.text.should.be.equal(mail.body);
				})
				.end(done);
		});
		it("should 400 on directory other than Drafts", (done) => {
			request(app)
				.del(`/api/groups/hehe/mail/INBOX/messages/${mailId}/attachments/${attId}`)
				.set({ Authorization: "Token "+token })
				.expect(400)
				.end(done);
		});
		it("should 400 on groupId other than int", (done) => {
			request(app)
				.del(`/api/groups/hehe/mail/Drafts/messages/${mailId}/attachments/${attId}`)
				.set({ Authorization: "Token "+token })
				.expect(400)
				.end(done);
		});
		it("should 400 on messageId other than int", (done) => {
			request(app)
				.del(`/api/groups/${groupId}/mail/Drafts/messages/hehe/attachments/${attId}`)
				.set({ Authorization: "Token "+token })
				.expect(400)
				.end(done);
		});
		it("should 400 on attachmentId other than int", (done) => {
			request(app)
				.del(`/api/groups/${groupId}/mail/Drafts/messages/${mailId}/attachments/hehe`)
				.set({ Authorization: "Token "+token })
				.expect(400)
				.end(done);
		});
		it("should 401 when token is missing", (done) => {
			request(app)
				.del(`/api/groups/${groupId}/mail/Drafts/messages/${mailId}/attachments/${attId}`)
				.expect(401)
				.end(done);
		});
		it("should 404 on non-existent group", (done) => {
			request(app)
				.del(`/api/groups/${9999999}/mail/Drafts/messages/${mailId}/attachments/${attId}`)
				.set({ Authorization: "Token "+token })
				.expect(404)
				.end(done);
		});
		it("should 404 on non-existent message", (done) => {
			request(app)
				.del(`/api/groups/${groupId}/mail/Drafts/messages/${9999999}/attachments/${attId}`)
				.set({ Authorization: "Token "+token })
				.expect(404)
				.end(done);
		});
		it("should 404 on non-existent attachment", (done) => {
			request(app)
				.del(`/api/groups/${groupId}/mail/Drafts/messages/${mailId}/attachments/${attId}`)
				.set({ Authorization: "Token "+token })
				.expect(404)
				.end(done);
		});
	});
});

// vim: noai:ts=4:sw=4
