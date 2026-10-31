import assert from "node:assert/strict";
import { test } from "node:test";
import { Writable } from "node:stream";
import { CloudinaryImageStorage } from "../src/storage/storage.js";
import type { CloudinaryClient } from "../src/services/cloudinary.service.js";
import type { UploadApiOptions } from "cloudinary";
import { validateEnv } from "../src/config/env.js";

const owner = "671000000000000000000010";
const key = "generations/671000000000000000000011/original.png";
const bytes = Buffer.from("test-image-bytes");
// Signature validation is separately covered by the service tests.
const png = Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), bytes]);
function fakeCloud() {
  const assets = new Map<string, Buffer>();
  const uploads: UploadApiOptions[] = [];
  const urls: unknown[] = [];
  const deletes: unknown[] = [];
  let timeoutNext = false;
  const client = {
    url(id: string, options: unknown) { urls.push(options); return "https://res.cloudinary.com/test/image/authenticated/" + id; },
    uploader: {
      upload_stream(options: UploadApiOptions, callback: (e: unknown, r?: unknown) => void) {
        const chunks: Buffer[] = [];
        return new Writable({
          write(chunk, _encoding, done) { chunks.push(Buffer.from(chunk)); done(); },
          final(done) {
            uploads.push(options);
            const id = String(options.public_id);
            if (!assets.has(id)) assets.set(id, Buffer.concat(chunks));
            if (timeoutNext) { timeoutNext = false; callback(Object.assign(new Error("timeout"), { code: "ETIMEDOUT" })); done(); return; }
            callback(null, {secure_url:"https://res.cloudinary.com/test/image/authenticated/"+id, public_id:id,asset_id:"asset-id",format:"png",width:1,height:1,bytes:assets.get(id)!.length,version:123});
            done();
          },
        });
      },
      async destroy(id: string, options: unknown) {
        deletes.push(options);
        return { result: assets.delete(id) ? "ok" : "not found" };
      },
    },
  } as unknown as CloudinaryClient;
  const transport: typeof fetch = async input => {
    const id = String(input).split("/authenticated/")[1];
    const content = assets.get(id);
    return content ? new Response(new Uint8Array(content)) : new Response(null,{status:404});
  };
  return {client, transport, assets, uploads, urls, deletes, timeout:()=>{timeoutNext=true;}};
}
test("Cloudinary adapter uses stable IDs, authenticated delivery, verifies bytes and preserves existing assets", async()=>{
  const f=fakeCloud(), adapter=new CloudinaryImageStorage(f.client,"primary","flux-studio/test",10,1000,f.transport);
  const object=await adapter.put(key,png,"image/png",owner);
  assert.equal(object.deliveryMode,"private");
  assert.equal(object.provider,"cloudinary");
  assert.equal(object.key,"flux-studio/test/"+key.replace(/\.png$/,""));
  await adapter.put(key,png,"image/png",owner);
  assert.equal(f.assets.size,1);
  assert.ok(f.uploads.every(o=>o.overwrite===false && o.type==="authenticated"));
  assert.ok(f.urls.every(o=> (o as {sign_url:boolean}).sign_url));
  await assert.rejects(adapter.put(key,Buffer.concat([png,Buffer.from("changed")]),"image/png",owner),/nội dung khác/);
  assert.deepEqual(f.assets.get(object.key),png);
  const stream=await adapter.openRead(object);const chunks=[];for await (const c of stream)chunks.push(c);
  assert.deepEqual(Buffer.concat(chunks),png);
  await adapter.delete(object);await adapter.delete(object);
  assert.equal(f.assets.size,0);
  assert.ok(f.deletes.every(o=>(o as {type:string}).type==="authenticated"));
});
test("uncertain upload reuses the same cloud object on saving retry",async()=>{
  const f=fakeCloud(), adapter=new CloudinaryImageStorage(f.client,"primary","flux-studio/test",10,1000,f.transport);
  f.timeout();await assert.rejects(adapter.put(key,png,"image/png",owner));
  assert.equal(f.assets.size,1);
  await adapter.put(key,png,"image/png",owner);
  assert.equal(f.assets.size,1);
  assert.equal(f.uploads[0].public_id,f.uploads[1].public_id);
});
test("adapter rejects untrusted descriptors, missing owner and failed private verification",async()=>{
  const f=fakeCloud(), adapter=new CloudinaryImageStorage(f.client,"primary","flux-studio/test",10,1000,f.transport);
  await assert.rejects(adapter.put(key,png,"image/png"));
  assert.equal(f.uploads.length,0);
  const object=await adapter.put(key,png,"image/png",owner);
  for(const bad of [{...object,accountAlias:"other"},{...object,deliveryMode:"public"},{...object,key:"https://evil.test/file"}])
    await assert.rejects(adapter.openRead(bad));
  const failed=new CloudinaryImageStorage(f.client,"primary","flux-studio/test",10,1000,async()=>new Response(null,{status:403}));
  await assert.rejects(failed.put(key,png,"image/png",owner));
});
test("no cloud is required for account/UI mode; partial secrets and enabled generation fail closed",()=>{
  const base={MONGODB_URI:"mongodb://127.0.0.1:27027/config_test"};
  assert.equal(validateEnv(base).cloudinaryApiSecret,undefined);
  assert.throws(()=>validateEnv({...base,CLOUDINARY_API_KEY:"placeholder"}));
  const ready={...base,GENERATION_ENABLED:"true",CLOUDFLARE_ACCOUNT_ID:"a".repeat(32),CLOUDFLARE_API_TOKEN:"placeholder",CLOUDINARY_CLOUD_NAME:"test",CLOUDINARY_API_KEY:"placeholder",CLOUDINARY_API_SECRET:"placeholder"};
  assert.equal(validateEnv(ready).generationEnabled,true);
});
