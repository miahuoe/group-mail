const should = require("should");
const assert = require("assert");
const request = require("supertest");
const app = require("../app");
const fs = require("fs");

const randomString = () => {
	return Date.now().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

const user = {
	login: randomString(),
	password: randomString(),
	email: randomString()+"@lolmail.com",
};

const group = {
	name: randomString(),
	maillocal: randomString(),
	description: randomString()
};

const filePath = "doc.yaml";

describe("mail & attachments", () => {
	let token = "";
	let groupId = 0;
	let mailId = 0;
	let attId = 0;
	before(async (done) => {
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
			})
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
	it("should add mail", (done) => {
		const mail = {
			subject: "subject",
			to: ["mail@mail.com"],
			body: "hello",
		};
		request(app)
			.post(`/api/groups/${groupId}/mail/Drafts`)
			.set({ Authorization: "Token "+token })
			.send(mail)
			.expect(201)
			.expect((res) => {
				res.body.should.have.property("subject");
				res.body.subject.should.be.equal("subject");
				//TODO
				//res.body.should.have.property("id");
			})
			.end(done);
	});
	it("should get Drafts folder with one message", (done) => {
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
				res.body[0].attachments.should.be.empty;
				mailId = res.body[0].id;
			})
			.end(done);
	});
	it("should find message", (done) => {
		request(app)
			.get(`/api/groups/${groupId}/mail/Drafts`)
			.set({ Authorization: "Token "+token })
			.query({ search: "hello" })
			.expect(200)
			.expect((res) => {
				res.body.should.be.an.array;
				res.body.should.not.be.empty;
				res.body.should.have.length(1);
				res.body[0].should.have.property("id");
				res.body[0].id.should.be.equal(mailId);
				res.body[0].should.have.property("attachments");
				res.body[0].attachments.should.be.an.array;
				res.body[0].attachments.should.be.empty;
				// TODO check body
			})
			.end(done);
	});
	it("should update mail", (done) => {
		const mail = {
			subject: "wassup?",
			to: ["mail@mail.com"],
			body: "hello 2",
		};
		request(app)
			.put(`/api/groups/${groupId}/mail/Drafts/messages/${mailId}`)
			.set({ Authorization: "Token "+token })
			.send(mail)
			.expect(201)
			.expect((res) => {
				res.body.should.have.property("subject");
				res.body.subject.should.be.equal("wassup?");
			})
			.end(done);
	});
	it("should post an attachment", (done) => {
		request(app)
			.post(`/api/groups/${groupId}/mail/Drafts/messages/${mailId}/attachments`)
			.set({ Authorization: "Token "+token })
			.attach("file", filePath, { contentType: "application/octet-stream" })
			.expect(201)
			.end(done);
	});
	it("should get Drafts folder with one message with one attachment", (done) => {
		request(app)
			.get(`/api/groups/${groupId}/mail/Drafts`)
			.set({ Authorization: "Token "+token })
			.expect(200)
			.expect((res) => {
				res.body.should.be.an.array;
				res.body.should.not.be.empty;
				res.body.should.have.length(1);
				res.body[0].should.have.property("id");
				//res.body[0].id.should.be.equal(mailId); // TODO
				res.body[0].should.have.property("attachments");
				res.body[0].attachments.should.be.an.array;
				res.body[0].attachments.should.not.be.empty;
				res.body[0].attachments.should.have.length(1);
				res.body[0].attachments[0].should.have.property("id");
				mailId = res.body[0].id;
				attId = res.body[0].attachments[0].id;
			})
			.end(done);
	});
	it("should download an attachment", (done) => {
		request(app)
			.get(`/api/groups/${groupId}/mail/Drafts/messages/${mailId}/attachments/${attId}`)
			.set({ Authorization: "Token "+token })
			.expect(200)
			.expect("Content-Type", "application/octet-stream")
			.expect((res) => {
				const orig = fs.readFileSync(filePath);
				const sent = res.body;
				assert(0 === Buffer.compare(orig, sent));
			})
			.end(done);
	});
	it("should delete an attachment", (done) => {
		request(app)
			.delete(`/api/groups/${groupId}/mail/Drafts/messages/${mailId}/attachments/${attId}`)
			.set({ Authorization: "Token "+token })
			.expect(204)
			.end(done);
	});
	it("should get Drafts folder with one message without attachment", (done) => {
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
				res.body[0].attachments.should.be.empty;
			})
			.end(done);
	});
	it("should 404 when downloading deleted attachment", (done) => {
		request(app)
			.get(`/api/groups/${groupId}/mail/Drafts/messages/${mailId}/attachments/${attId}`)
			.set({ Authorization: "Token "+token })
			.expect(404)
			.end(done);
	});
	it("should delete a message", (done) => {
		request(app)
			.delete(`/api/groups/${groupId}/mail/Drafts/messages/${mailId}`)
			.set({
				Authorization: "Token "+token,
			})
			.expect(204)
			.end(done);
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
})

// vim: noai:ts=4:sw=4
