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
			.expect("Content-Type", "application/json; charset=utf-8")
			.expect((res) => {
				token = res.body.token;
			})
			.expect(200, done);
	});
	it("should create a new group", (done) => {
		request(app)
			.post("/api/groups")
			.set({
				Authorization: "Token "+token,
				"Content-Type": "application/json",
			})
			.send(group)
			.expect((res) => {
				res.body.should.have.property("id");
				groupId = res.body.id;
			})
			.expect(201, done);
	});
	it("should get empty Drafts folder", (done) => {
		request(app)
			.get(`/api/groups/${groupId}/mail/Drafts`)
			.set({
				Authorization: "Token "+token,
			})
			.expect((res) => {
				res.body.should.be.an.array;
				res.body.should.be.empty;
			})
			.expect(200, done);
	});
	it("should reject mail with missing field", (done) => {
		const mail = {
			title: "title",
			recipients: ["mail@mail.com"],
		};
		request(app)
			.post(`/api/groups/${groupId}/mail/Drafts`)
			.set({
				Authorization: "Token "+token,
			})
			.send(mail)
			.expect(400, done);
	});
	it("should update mail", (done) => {
		const mail = {
			title: "title",
			recipients: ["mail@mail.com"],
			body: "hello",
		};
		request(app)
			.put(`/api/groups/${groupId}/mail/Drafts`)
			.set({
				Authorization: "Token "+token,
			})
			.send(mail)
			.expect((res) => {
				res.body.should.have.property("id");
			})
			.expect(201, done);
	});
})

// vim: noai:ts=4:sw=4
