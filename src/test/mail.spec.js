const should = require("should");
const assert = require("assert");
const request = require("supertest");
const app = require("../app");
const randomString = require("../lib/randomString");

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

describe("mail", () => {
	describe("GET /api/groups/:id/mail/:dir", () => {
		let token = "";
		let groupId = 0;
		before(async (done) => {
			[token, groupId] = await createGroup();
			done();
		});
		it("should get empty Drafts folder", (done) => {
			request(app)
				.get(`/api/groups/${groupId}/mail/Drafts`)
				.set({ Authorization: "Token "+token })
				.expect(200)
				.expect((res) => {
					res.body.should.be.an.array;
					res.body.should.be.empty;
				})
				.end(done);
		});
	});

	describe("POST /api/groups/:id/mail/:dir", () => {
		let token = "";
		let groupId = 0;
		before(async (done) => {
			[token, groupId] = await createGroup();
			done();
		});
		it("should reject mail with missing field", (done) => {
			const mail = {
				subject: "subject",
				to: ["mail@mail.com"],
			};
			request(app)
				.post(`/api/groups/${groupId}/mail/Drafts`)
				.set({ Authorization: "Token "+token })
				.send(mail)
				.expect(400)
				.end(done);
		});
		it("should reject mail in directory other than Drafts", (done) => {
			const mail = {
				subject: "subject",
				to: ["mail@mail.com"],
			};
			request(app)
				.post(`/api/groups/${groupId}/mail/Sent`)
				.set({ Authorization: "Token "+token })
				.send(mail)
				.expect(400)
				.end(done);
		});
		it("should accept mail", (done) => {
			const mail = {
				subject: "subject",
				to: ["mail@mail.com"],
				body: "hello imap",
			};
			request(app)
				.post(`/api/groups/${groupId}/mail/Drafts`)
				.set({ Authorization: "Token "+token })
				.send(mail)
				.expect(201)
				.expect((res) => {
					res.body.should.be.an.object;
					res.body.should.have.property("from");
					res.body.should.have.property("to");
					res.body.should.have.property("subject");
					res.body.should.have.property("attachments");
					res.body.should.have.property("date");
					res.body.should.have.property("body");

					res.body.subject.should.be.equal("subject");
					res.body.should.have.property("id");
				})
				.end(done);
		});
	});

	describe("DELETE /api/groups/:id/mail/:dir/messages/:id", () => {
		let token = "";
		let groupId = 0;
		let mailId = 0;
		before(async (done) => {
			[token, groupId] = await createGroup();
			const mail = {
				subject: "subject",
				to: ["mail@mail.com"],
				body: "hello imap",
			};
			await request(app)
				.post(`/api/groups/${groupId}/mail/Drafts`)
				.set({ Authorization: "Token "+token })
				.send(mail)
				.expect(201)
				.expect((res) => {
					res.body.should.have.property("id");
					mailId = res.body.id;
				});
			done();
		});
		it("should 401 on missing token", (done) => {
			request(app)
				.del(`/api/groups/${groupId}/mail/Drafts/messages/${mailId}`)
				.expect(401)
				.end(done);
		});
		it("should 404 on non-existent message", (done) => {
			request(app)
				.del(`/api/groups/${groupId}/mail/Drafts/messages/${9999999}`)
				.set({ Authorization: "Token "+token })
				.expect(404)
				.end(done);
		});
		it("should 404 on non-existent group", (done) => {
			request(app)
				.del(`/api/groups/${999999}/mail/Drafts/messages/${mailId}`)
				.set({ Authorization: "Token "+token })
				.expect(404)
				.end(done);
		});
		it("should delete a message", async (done) => {
			await request(app)
				.del(`/api/groups/${groupId}/mail/Drafts/messages/${mailId}`)
				.set({ Authorization: "Token "+token })
				.expect(204);
			await request(app)
				.get(`/api/groups/${groupId}/mail/Drafts`)
				.set({ Authorization: "Token "+token })
				.expect(200)
				.expect((res) => {
					res.body.should.be.an.array;
					res.body.should.be.empty;
				});
			done();
		});
	});

	describe("GET /api/groups/:id/mail/:dir/messages/:id", () => {
		let token = "";
		let groupId = 0;
		let mailId = 0;
		const mail = {
			subject: "subject",
			to: ["mail@mail.com"],
			body: "hello imap",
		};
		before(async (done) => {
			[token, groupId] = await createGroup();
			request(app)
				.post(`/api/groups/${groupId}/mail/Drafts`)
				.set({ Authorization: "Token "+token })
				.send(mail)
				.expect(201)
				.expect((res) => {
					res.body.should.be.an.object;
					res.body.should.have.property("id");
					mailId = res.body.id;
				})
				.end(done);
		});
		it("should get message with body", (done) => {
			request(app)
				.get(`/api/groups/${groupId}/mail/Drafts/messages/${mailId}`)
				.set({ Authorization: "Token "+token })
				.expect(200)
				.expect((res) => {
					res.body.should.have.properties(["id", "from", "date", "body", "subject", "to"]);
					res.body.body.should.be.equal(mail.body);
				})
				.end(done);
		});
	});

	describe("GET /api/groups/:id/mail/:dir", () => {
		let mails = [
			{
				subject: "find me",
				to: ["mail@mail.com"],
				body: randomString(),
			},
		];
		let token = "";
		let groupId = 0;
		const genMails = 19;
		before(async (done) => {
			[token, groupId] = await createGroup();
			for (i = 0; i < genMails; i++) {
				mails.push({
					subject: `mail ${i}`,
					to: ["mail@mail.com"],
					body: "hello imap",
				});
			}
			for (i = 0; i < mails.length; i++) {
				await request(app)
					.post(`/api/groups/${groupId}/mail/Drafts`)
					.set({ Authorization: "Token "+token })
					.send(mails[i])
					.expect(201)
					.expect((res) => {
						res.body.should.have.properties(["from", "to", "subject"]);

						res.body.subject.should.be.equal(mails[i].subject);
						res.body.should.have.property("id");
						mails[i].id = res.body.id;
					});
			}
			done();
		});
		it(`should get Drafts folder with 10 (limit) messages`, (done) => {
			request(app)
				.get(`/api/groups/${groupId}/mail/Drafts`)
				.set({ Authorization: "Token "+token })
				.query({ limit: 10 })
				.expect(200)
				.expect((res) => {
					res.body.should.be.an.array;
					res.body.should.have.length(10);
					res.body[0].should.have.property("id");
					res.body[0].should.have.property("attachments");
					res.body[0].should.have.property("from");
					res.body[0].should.have.property("to");
					res.body[0].attachments.should.be.an.array;
					res.body[0].attachments.should.be.empty;
				})
				.end(done);
		});
		it("should find 1 message", (done) => {
			request(app)
				.get(`/api/groups/${groupId}/mail/Drafts`)
				.set({ Authorization: "Token "+token })
				.query({ search: mails[0].body })
				.expect(200)
				.expect((res) => {
					res.body.should.be.an.array;
					res.body.should.have.length(1);
					res.body[0].should.have.property("id");
					res.body[0].should.have.property("attachments");
					res.body[0].attachments.should.be.an.array;
					res.body[0].attachments.should.be.empty;
					res.body[0].id.should.be.equal(mails[0].id);
					res.body[0].subject.should.be.equal(mails[0].subject);
				})
				.end(done);
		});
		it(`should find 10 (limit) messages`, (done) => {
			request(app)
				.get(`/api/groups/${groupId}/mail/Drafts`)
				.set({ Authorization: "Token "+token })
				.query({ limit: 10, search: "hello" })
				.expect(200)
				.expect((res) => {
					res.body.should.be.an.array;
					res.body.should.have.length(10);
				})
				.end(done);
		});
		it(`should get 15 recent messages`, (done) => {
			request(app)
				.get(`/api/groups/${groupId}/mail/Drafts`)
				.set({ Authorization: "Token "+token })
				.query({ limit: 15 })
				.expect(200)
				.expect((res) => {
					res.body.should.be.an.array;
					res.body.should.have.length(15);
					for (let i = 0; i < 15; i++) {
						res.body[i].id.should.be.equal(mails[mails.length-1 - i].id);
					}
				})
				.end(done);
		});
		it(`should get 15 recent messages with offset 5`, (done) => {
			request(app)
				.get(`/api/groups/${groupId}/mail/Drafts`)
				.set({ Authorization: "Token "+token })
				.query({ limit: 15, offset: 5 })
				.expect(200)
				.expect((res) => {
					res.body.should.be.an.array;
					res.body.should.have.length(15);
					for (let i = 0; i < 15; i++) {
						res.body[i].id.should.be.equal(mails[mails.length-1 - 5- i].id);
					}
				})
				.end(done);
		});
	});

	describe("PUT /api/groups/:id/mail/:dir/messages/:id", () => {
		let token = "";
		let groupId = 0;
		let mailId = 0;
		const oldMail = {
			subject: "subject",
			to: ["mail@mail.com"],
			body: "hello imap",
		};
		const newMail = {
			subject: "wassup?",
			to: ["mail@mail.com"],
			body: "hello 2",
		};
		before(async (done) => {
			[token, groupId] = await createGroup();
			await request(app)
				.post(`/api/groups/${groupId}/mail/Drafts`)
				.set({ Authorization: "Token "+token })
				.send(oldMail)
				.expect(201)
				.expect((res) => {
					res.body.should.have.property("subject");
					res.body.subject.should.be.equal(oldMail.subject);
					res.body.should.have.property("id");
					mailId = res.body.id;
				});
			await request(app)
				.put(`/api/groups/${groupId}/mail/Drafts/messages/${mailId}`)
				.set({ Authorization: "Token "+token })
				.send(newMail)
				.expect(200)
				.expect((res) => {
					res.body.should.have.property("subject");
					res.body.subject.should.be.equal(newMail.subject);
					res.body.should.have.property("id");
					mailId = res.body.id;
				})
			done();
		});
		it("should have updated body", async (done) => {
			await request(app)
				.get(`/api/groups/${groupId}/mail/Drafts/messages/${mailId}`)
				.set({ Authorization: "Token "+token })
				.expect(200)
				.expect((res) => {
					res.body.should.have.property("body");
					res.body.body.should.be.equal(newMail.body);
				});
			done();
		});
		it("should have updated subject", async (done) => { // TODO
			done();
		});
	});
});

// vim: noai:ts=4:sw=4
