import { expect, assert } from  "chai";
import * as im from "../src/infomark/InfoMark";
import * as imi from "../src/infomark/InfoMark.interface";

const m: im.InfoMark = new im.InfoMark("localhost", 2020, false);

const mail = "some.user@university.com";
const password = "1234567";
const badmail = "does.not@exist.com";

describe("InfoMark", () => {
    describe("Common", () => {
        it("Ping", async () => assert.equal(await m.common.ping(), "pong"));
        it("Version", async () => {
            const res = await m.common.version();
            assert.exists(res);
            assert.property(res, "commit");
            assert.property(res, "version");
        });
        it("Privacy Statement", async () => {
            const res = await m.common.privacyStatement();
            assert.exists(res);
            assert.property(res, "text");
        });
        //it('should return -1 when the value is not present', async () => assert.equal(await m.common.ping(), "pong"));
    });

    describe("Auth", () => {
        describe("Token", () => {
            it("Success", async () => {
                const res = await m.auth.token(mail, password);
                assert.exists(res);
                assert.property(res, "access");
                assert.property(res, "refresh");
            });
            it("Wrong Password", async () => {
                const res = await m.auth.token(mail, "none");
                // assert res is a Status
                assert.equal((<imi.Status>res).status, "Not Found");
            });
            it("Wrong Email", async () => {
                const res = await m.auth.token(badmail, "none");
                // assert res is a Status
                assert.equal((<imi.Status>res).status, "Not Found");
            });
        });
        describe("Request Password Reset", () => {
            it("Success", async() => {
                assert.equal(await m.auth.requestPasswordReset(mail), true);
            });
            it("Unknown Address", async() => {
                const res = await m.auth.requestPasswordReset(badmail);
                assert.isNotTrue(res);
                assert.equal((<imi.Status>res).status, "Bad Request");
            });
        });
        describe("Confirm Email", () => {
            it("Wrong Token", async() => {
                const res = await m.auth.confirmEmail(mail, "asdf");
                assert.equal(res.status, "Bad Request");
            });
            it("Wrong Address", async() => {
                const res = await m.auth.confirmEmail(badmail, "asdf");
                assert.equal(res.status, "Bad Request");
            });
            // test for success?
        });
        describe("Update Password", () => {
            it("Wrong Token", async() => {
                const res = await m.auth.updatePassword(mail, "asdf", "token");
                assert.equal(res.status, "Bad Request");
            });
            it("Wrong Address", async() => {
                const res = await m.auth.updatePassword(badmail, "asdf", "token");
                assert.equal(res.status, "Bad Request");
            });
            // test for success?
        });
        describe("Sessions Post", () => {
            it("Success", async () => {
                const res = await m.auth.sessions().post(mail, password);
                assert.exists(res);
                assert.property(res, "root"); // this surely isn't the case for every request...
            });
            it("Wrong Password", async () => {
                const res = await m.auth.sessions().post(mail, "none");
                // assert res is a Status
                assert.equal((<imi.Status>res).error, "credentials are wrong");
            });
            it("Wrong Email", async () => {
                const res = await m.auth.sessions().post(badmail, "none");
                // assert res is a Status
                assert.equal((<imi.Status>res).status, "Bad Request");
            });
            // should be able to use refresh token?
        });
        describe("Sessions Delete", () => {
            it("Unauthorised", async () => {
                const res = await m.auth.sessions().delete("invalid token");
                assert.exists(res);
                assert.equal(res.status, "Forbidden");
            });
            it("Success", async () => {
                const tok = await m.auth.token(mail, password);
                const res = await m.auth.sessions().delete((<imi.AuthResponse>tok).access.token);
                assert.isTrue(res);
            });
        });
    });
    describe("Account", () => {
        describe("Exam Enrollments", () => {
            it("Unauthorised", async () => {
                const res = await m.account.examEnrollments("invalid token");
                assert.equal((<imi.Status>res).status, "Forbidden");
            });
            it("Success", async () => {
                const token = <imi.AuthResponse>await m.auth.token(mail, password);
                const res = await m.account.examEnrollments(token.access.token);
                console.log(res);
                assert.isArray(res);
            });
        });
     });
});
            //