const should = require("should");
const assert = require("assert");
const request = require("supertest");
const app = require("../app");

const randomString = () => {
	return Date.now().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

const login = randomString();
const password = randomString();
const email = randomString();
let token = "";
const group = {
	name: randomString(),
	maillocal: randomString(),
	description: randomString()
};
let groupId = 0;
let mailId = 0;

describe("mail & attachments", () => {
	it("should create an user", (done) => {
		const req = {
			login: login,
			password: password,
			email: email+"@xd.com"
		};
		request(app)
			.post("/api/users/register")
			.send(req)
			.expect(201, done);
	});
	it("should login", (done) => {
		request(app)
			.post("/api/users/login")
			.auth(login, password)
			.expect(200)
			.expect("Content-Type", "application/json; charset=utf-8")
			.expect((res) => {
				res.body.should.have.property("token");
				token = res.body.token;
			})
			.end(done);
	});
	it("should create a new group", (done) => {
		request(app)
			.post("/api/groups")
			.set({
				Authorization: "Token "+token,
				"Content-Type": "application/json",
			})
			.send(group)
			.expect(201)
			.expect((res) => {
				res.body.should.have.property("id");
				groupId = res.body.id;
			})
			.end(done);
	});
	it("should get empty Drafts folder", (done) => {
		request(app)
			.get(`/api/groups/${groupId}/mail/Drafts`)
			.set({
				Authorization: "Token "+token,
			})
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
			recipients: ["mail@mail.com"],
		};
		request(app)
			.post(`/api/groups/${groupId}/mail/Drafts`)
			.set({
				Authorization: "Token "+token,
			})
			.send(mail)
			.expect(400)
			.end(done);
	});
	it("should reject mail in directory other than Drafts", (done) => {
		const mail = {
			subject: "subject",
			recipients: ["mail@mail.com"],
		};
		request(app)
			.post(`/api/groups/${groupId}/mail/Sent`)
			.set({
				Authorization: "Token "+token,
			})
			.send(mail)
			.expect(400)
			.end(done);
	});
	it("should add mail", (done) => {
		const mail = {
			subject: "subject",
			recipients: ["mail@mail.com"],
			body: "hello",
		};
		request(app)
			.post(`/api/groups/${groupId}/mail/Drafts`)
			.set({
				Authorization: "Token "+token,
			})
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
			.set({
				Authorization: "Token "+token,
			})
			.expect(200)
			.expect((res) => {
				res.body.should.be.an.array;
				res.body.should.not.be.empty;
				res.body.should.have.length(1);
				res.body[0].should.have.property("id");
				mailId = res.body[0].id;
			})
			.end(done);
	});
	it("should update mail", (done) => {
		const mail = {
			subject: "wassup?",
			recipients: ["mail@mail.com"],
			body: "hello 2",
		};
		request(app)
			.put(`/api/groups/${groupId}/mail/Drafts/${mailId}`)
			.set({
				Authorization: "Token "+token,
			})
			.send(mail)
			.expect(201)
			.expect((res) => {
				res.body.should.have.property("subject");
				res.body.subject.should.be.equal("wassup?");
			})
			.end(done);
	});
})

// vim: noai:ts=4:sw=4
