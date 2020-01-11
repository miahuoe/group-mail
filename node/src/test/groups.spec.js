"use strict";
/* jshint node: true, mocha: true, esversion: 8, unused: true, expr: true */

const should = require("should");
const assert = require("assert");
const request = require("supertest");
const app = require("../app");
const randomString = require("../lib/randomString");

const numUsers = 12;

const createUsers = async (N = 1) => {
	let users = [];
	for (let i = 0; i < N; i++) {
		let user = {
			login: randomString()+i,
			password: randomString()+i,
			email: randomString()+i+"@mmail.com",
		};
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
				res.body.should.have.property("userData");
				res.body.should.be.string;
				user.token = res.body.token;
				user.id = res.body.userData.id;
			});
		users.push(user);
	}
	return users;
};

const createGroup = async (user) => {
	let group = {
		name: randomString(),
		maillocal: randomString(),
		description: "desc"
	};
	await request(app)
		.post("/api/groups")
		.set({ Authorization: "Token "+user.token })
		.send(group)
		.expect((res) => {
			res.body.should.be.object;
			res.body.should.have.property("id");
			group.id = res.body.id;
		})
		.expect(201);
	return group;
};

describe("groups", () => {
	let users = [];
	before(async (done) => {
		users = await createUsers(numUsers);
		done();
	});

	describe("GET /api/groups", () => {
		let users = [];
		let group;
		before(async (done) => {
			users = await createUsers(2);
			group = await createGroup(users[1]);
			done();
		});
		it("should 401 when not authorized", (done) => {
			request(app)
				.get("/api/groups")
				.expect(401)
				.end(done);
		});
		it("should get an empty list of groups", (done) => {
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
		it("should get the only group", (done) => {
			request(app)
				.get("/api/groups")
				.set({ Authorization: "Token "+users[1].token })
				.expect((res) => {
					res.body.should.be.an.array;
					res.body.should.have.length(1);
				})
				.expect(200)
				.end(done);
		});
	});
	describe("POST /api/groups", () => {
		it("should 400 too short name", (done) => {
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
		it("should create a new group", (done) => {
			const group = {
				name: randomString(),
				maillocal: randomString(),
				description: "desc"
			};
			request(app)
				.post("/api/groups")
				.set({
					Authorization: "Token "+users[0].token,
				})
				.send(group)
				.expect((res) => {
					res.body.should.be.object;
					res.body.should.have.property("id");
				})
				.expect(201)
				.end(done);
		});
	});

	describe("GET /api/groups/:id/users", () => {
		let groups = [];
		before(async (done) => {
			for (let i = 0; i < 2; i++) {
				groups.push(await createGroup(users[i]));
			}
			done();
		});
		it("should 404 on non-existent group", (done) => {
			request(app)
				.get(`/api/groups/${groups[1].id+100}/users`)
				.set({ Authorization: "Token "+users[1].token })
				.expect(404)
				.end(done);
		});
		it("should get one group member", (done) => {
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
	});
	describe("POST /api/groups/:id/users", () => {
		let group;
		before(async (done) => {
			group = await createGroup(users[1]);
			done();
		});
		it("should invite 4 users and GET 5 members (members invite too)", async (done) => {
			for (let i = 2; i < 6; i++) {
				await request(app)
					.post(`/api/groups/${group.id}/users`)
					.query({ email: users[i].email })
					.set({ Authorization: "Token "+users[i-1].token })
					.expect(201);
			}
			await request(app)
				.get(`/api/groups/${group.id}/users`)
				.set({ Authorization: "Token "+users[1].token })
				.expect(200)
				.expect((res) => {
					res.body.should.be.an.array;
					res.body.should.have.length(5);
				});
			done();
		});
		it("should 401 on missing token", (done) => {
			request(app)
				.post(`/api/groups/${group.id}/users`)
				.expect(401)
				.end(done);
		});
		it("should 400 on missing query parameter", (done) => {
			request(app)
				.post(`/api/groups/${group.id}/users`)
				.set({ Authorization: "Token "+users[1].token })
				.expect(400)
				.end(done);
		});
		it("should 404 on inexisting user", (done) => { // TODO email invitation
			request(app)
				.post(`/api/groups/${group.id}/users`)
				.set({ Authorization: "Token "+users[1].token })
				.query({ email: "hohoho@hohomail.com" })
				.expect(404)
				.end(done);
		});
		it("should 400 on member user", (done) => {
			request(app)
				.post(`/api/groups/${group.id}/users`)
				.set({ Authorization: "Token "+users[1].token })
				.query({ email: users[1].email })
				.expect(400)
				.end(done);
		});

		describe("POST /api/groups/:id/leave", () => {
			let group;
			before(async (done) => {
				group = await createGroup(users[0]);
				for (let i = 1; i < 10; i++) {
					await request(app)
						.post(`/api/groups/${group.id}/users`)
						.query({ email: users[i].email })
						.set({ Authorization: "Token "+users[0].token })
						.expect(201);
				}
				done();
			});
			it("should 401 on missing token", (done) => {
				request(app)
					.post(`/api/groups/${group.id}/users`)
					.expect(401)
					.end(done);
			});
			it("should 404 on non-existing user", (done) => {
				request(app)
					.post(`/api/groups/${group.id+100}/users`)
					.set({ Authorization: "Token "+users[1].token })
					.query({ email: randomString()+"@mail.com" })
					.expect(404)
					.end(done);
			});
			it("should 404 on non-existing group", (done) => {
				request(app)
					.post(`/api/groups/9999999/users`)
					.set({ Authorization: "Token "+users[1].token })
					.query({ email: users[1].email })
					.expect(404)
					.end(done);
			});
			it("should 400 on group admin", (done) => {
				request(app)
					.post(`/api/groups/${group.id}/users`)
					.set({ Authorization: "Token "+users[1].token })
					.expect(400)
					.end(done);
			});
			it("should leave 2 users and recieve remaining 7 members", async (done) => {
				for (let i = 8; i < 10; i++) {
					await request(app)
						.post(`/api/groups/${group.id}/leave`)
						.set({ Authorization: "Token "+users[i].token })
						.expect(204);
				}
				for (let i = 0; i < 8; i++) {
					await request(app)
						.get(`/api/groups/${group.id}/users`)
						.set({ Authorization: "Token "+users[i].token })
						.expect(200)
						.expect((res) => {
							res.body.should.be.an.array;
							res.body.should.have.length(8);
						});
				}
				for (let i = 8; i < 10; i++) {
					await request(app)
						.get(`/api/groups/${group.id}/users`)
						.set({ Authorization: "Token "+users[i].token })
						.expect(401);
				}
				done();
			});
		});

		describe("DELETE /api/groups/:id/users/:id", () => {
			let group;
			before(async (done) => {
				group = await createGroup(users[0]);
				await request(app)
					.post(`/api/groups/${group.id}/users`)
					.query({ email: users[1].email })
					.set({ Authorization: "Token "+users[0].token })
					.expect(201);
				done();
			});
			it("should 400 on group admin", (done) => {
				request(app)
					.del(`/api/groups/${group.id}/users/${users[0].id}`)
					.set({ Authorization: "Token "+users[0].token })
					.expect(400)
					.end(done);
			});
			it("should 403 when called by a normal member", (done) => {
				request(app)
					.del(`/api/groups/${group.id}/users/1`)
					.set({ Authorization: "Token "+users[1].token })
					.expect(403)
					.end(done);
			});
			it("should 400 on non-member", (done) => {
				request(app)
					.del(`/api/groups/${group.id}/users/${users[numUsers-1].id}`)
					.set({ Authorization: "Token "+users[0].token })
					.expect(400)
					.end(done);
			});
			it("should 404 on non-existing group", (done) => {
				request(app)
					.del(`/api/groups/999999999/users/999999999`)
					.set({ Authorization: "Token "+users[0].token })
					.expect(404)
					.end(done);
			});
			it("should 404 on non-existing user", (done) => {
				request(app)
					.del(`/api/groups/${group.id}/users/999999999`)
					.set({ Authorization: "Token "+users[0].token })
					.expect(404)
					.end(done);
			});
			it("should kick member and deny access to that member", async (done) => {
				await request(app)
					.get(`/api/groups/${group.id}/users`)
					.set({ Authorization: "Token "+users[1].token })
					.expect(200)
					.expect((res) => {
						res.body.should.be.an.array;
						res.body.should.have.length(2);
					});
				await request(app)
					.get(`/api/groups/${group.id}/users`)
					.set({ Authorization: "Token "+users[0].token })
					.expect(200)
					.expect((res) => {
						res.body.should.be.an.array;
						res.body.should.have.length(2);
					});
				await request(app)
					.del(`/api/groups/${group.id}/users/${users[1].id}`)
					.set({ Authorization: "Token "+users[0].token })
					.expect(204);
				await request(app)
					.get(`/api/groups/${group.id}/users`)
					.set({ Authorization: "Token "+users[0].token })
					.expect(200)
					.expect((res) => {
						res.body.should.be.an.array;
						res.body.should.have.length(1);
					});
				await request(app)
					.get(`/api/groups/${group.id}/users`)
					.set({ Authorization: "Token "+users[1].token })
					.expect(401);
				done();
			});
		});
	});
});

// vim: noai:ts=4:sw=4
