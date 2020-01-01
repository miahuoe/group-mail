const should = require("should");
const assert = require("assert");
const request = require("supertest");
const app = require("../app");
const randomString = require("../lib/randomString");

const numUsers = 10;

describe("/api/groups", () => {
	let users = [];
	before(async (done) => {
		for (i = 0; i < numUsers; i++) {
			let user = {
				login: randomString()+i,
				password: randomString()+i,
				email: randomString()+i+"@mailmail.com",
			};
			await request(app)
				.post("/api/users/register")
				.send(user)
				.expect(201);
			await request(app)
				.post("/api/users/login")
				.auth(user.login, user.password)
				.expect((res) => {
					res.body.should.have.property("token");
					res.body.should.be.string;
					user.token = res.body.token;
				})
				.expect(200);
			users.push(user);
		}
		done();
	});

	describe("/api/groups", () => {
		it("GET should get an empty list of groups", (done) => {
			request(app)
				.get("/api/groups")
				.set({ Authorization: "Token "+users[0].token })
				.expect((res) => {
					res.body.should.be.an.array;
					res.body.should.be.empty;
				})
				.expect(200)
				.end(done);
		});
		it("POST should reject too short name", (done) => {
			const group = {
				name: "group1",
				maillocal: "group1",
				description: "desc"
			};
			request(app)
				.post("/api/groups")
				.set({ Authorization: "Token "+users[0].token })
				.send(group)
				.expect(400)
				.end(done);
		});
		it("POST should create a new group", (done) => {
			const group = {
				name: randomString(),
				maillocal: randomString(),
				description: "desc"
			};
			request(app)
				.post("/api/groups")
				.set({
					Authorization: "Token "+users[0].token,
					"Content-Type": "application/json",
				})
				.send(group)
				.expect((res) => {
					res.body.should.be.object;
					res.body.should.have.property("id");
				})
				.expect(201, done);
		});
		it("GET should get the only group", (done) => {
			request(app)
				.get("/api/groups")
				.set({ Authorization: "Token "+users[0].token })
				.expect((res) => {
					res.body.should.be.an.array;
					res.body.should.not.be.empty;
					res.body.should.have.length(1);
				})
				.expect(200)
				.end(done);
		});
	});

	describe("/api/groups/:id/users", () => {
		let groups = [];
		before(async (done) => {
			for (i = 0; i < 2; i++) {
				let group = {
					name: randomString(),
					maillocal: randomString(),
					description: randomString()
				};
				await request(app)
					.post("/api/groups")
					.set({ Authorization: "Token "+users[1].token })
					.send(group)
					.expect((res) => {
						res.body.should.be.object;
						res.body.should.have.property("id");
						res.body.should.have.property("name");
						//res.body.should.have.property("created");
						//res.body.should.have.property("email");
						group.id = res.body.id;
					})
					.expect(201);
				groups.push(group);
			}
			done();
		});
		it("GET should 404 on non-existent group", (done) => {
			request(app)
				.get(`/api/groups/${groups[1].id+10}/users`)
				.set({ Authorization: "Token "+users[1].token })
				.expect(404)
				.end(done);
		});
		it("GET should get one group member", (done) => {
			request(app)
				.get(`/api/groups/${groups[1].id}/users`)
				.set({ Authorization: "Token "+users[1].token })
				.expect(200)
				.expect((res) => {
					res.body.should.be.an.array;
					res.body.should.have.length(1);
					res.body[0].should.have.property("id");
					res.body[0].should.have.property("login");
				})
				.end(done);
		});
		it("POST should invite 8 users and GET 9 members (members invite too)", async (done) => {
			for (i = 2; i < 10; i++) {
				await request(app)
					.post(`/api/groups/${groups[1].id}/users`)
					.query({ email: users[i].email })
					.set({ Authorization: "Token "+users[i].token })
					.expect(201);
			}
			await request(app)
				.get(`/api/groups/${groups[1].id}/users`)
				.set({ Authorization: "Token "+users[1].token })
				.expect(200)
				.expect((res) => {
					res.body.should.be.an.array;
					res.body.should.have.length(9);
				})
			done();
		});
		it("POST should 401 on missing token", (done) => {
			request(app)
				.post(`/api/groups/${groups[1].id}/users`)
				.expect(401)
				.end(done);
		});
		it("POST should 400 on missing query parameter", (done) => {
			request(app)
				.post(`/api/groups/${groups[1].id}/users`)
				.set({ Authorization: "Token "+users[1].token })
				.expect(400)
				.end(done);
		});
		it("POST should 404 on inexisting user", (done) => { // TODO email invitation
			request(app)
				.post(`/api/groups/${groups[1].id}/users`)
				.set({ Authorization: "Token "+users[1].token })
				.query({ email: "hohoho@hohomail.com" })
				.expect(404)
				.end(done);
		});
		it("POST should 400 on member user", (done) => {
			request(app)
				.post(`/api/groups/${groups[1].id}/users`)
				.set({ Authorization: "Token "+users[1].token })
				.query({ email: users[1].email })
				.expect(400)
				.end(done);
		});

		describe("/api/groups/:id/leave", () => {
			it("POST should 401 on missing token", (done) => {
				request(app)
					.post(`/api/groups/${groups[1].id}/users`)
					.expect(401)
					.end(done);
			});
			it("POST should 404 on non-existing user", (done) => {
				request(app)
					.post(`/api/groups/${groups[1].id+100}/users`)
					.set({ Authorization: "Token "+users[1].token })
					.query({ email: randomString()+"@mail.com" })
					.expect(404)
					.end(done);
			});
			it("POST should 404 on non-existing group", (done) => {
				request(app)
					.post(`/api/groups/${groups[1].id+100}/users`)
					.set({ Authorization: "Token "+users[1].token })
					.query({ email: users[1].email })
					.expect(404)
					.end(done);
			});
			it("POST should 400 on group admin", (done) => {
				request(app)
					.post(`/api/groups/${groups[1].id}/users`)
					.set({ Authorization: "Token "+users[1].token })
					.expect(400)
					.end(done);
			});
			it("should remove 2 users and recieve remaining 7 members", async (done) => {
				for (i = 8; i < 10; i++) {
					await request(app)
						.post(`/api/groups/${groups[1].id}/leave`)
						.set({ Authorization: "Token "+users[i].token })
						.expect(204);
				}
				for (i = 0; i < 8; i++) {
					await request(app)
						.get(`/api/groups/${groups[1].id}/users`)
						.set({ Authorization: "Token "+users[i].token })
						.expect(200)
						.expect((res) => {
							res.body.should.be.an.array;
							res.body.should.have.length(7);
						});
				}
				done();
			});
		});
		describe("DELETE /api/groups/:id/users/:id", () => {
			let adminId = 0;
			before((done) => {
				request(app)
					.get(`/api/groups/${groups[1].id}/users`)
					.set({ Authorization: "Token "+users[1].token })
					.expect(200)
					.expect((res) => {
						res.body.should.be.an.array;
						res.body.should.have.length(7);
						adminId = res.body.find(u => u.login == users[1].login);
					})
					.end(done);
			});
			it("should 400 on group admin", (done) => {
				request(app)
					.delete(`/api/groups/${groups[1].id}/users/${adminId}`)
					.set({ Authorization: "Token "+users[1].token })
					.expect(400)
					.end(done);
			});
			it("should 401 when called by a normal member", (done) => {
				request(app)
					.delete(`/api/groups/${groups[1].id}/users/1`)
					.set({ Authorization: "Token "+users[3].token })
					.expect(401)
					.end(done);
			});
			it("should 404 on non-existing user", (done) => {
				request(app)
					.delete(`/api/groups/${groups[1].id}/users/${adminId+1000}`)
					.set({ Authorization: "Token "+users[1].token })
					.expect(400)
					.end(done);
			});
		});
	});
});

// vim: noai:ts=4:sw=4
