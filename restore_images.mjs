// 옛 프로젝트(coffee-f70dc)에 남아 있는 원두 사진을 새 프로젝트(coffee-web-508305)로 옮기는 스크립트.
// migrate.mjs가 데이터를 옮길 때 imageUrl을 비워서, 예전 원두들의 사진이 안 나오는 문제를 복구함.
//
// 사전 조건: coffee-f70dc 프로젝트에 결제 계정이 연결되어 있어야 함 (안 되어 있으면 사진 다운로드가 402 오류).
// 실행:  node restore_images.mjs --dry   (확인만, 아무것도 바꾸지 않음)
//        node restore_images.mjs         (실제로 옮기기)
// 끝나면 coffee-f70dc의 결제 계정 연결은 다시 해제해도 됨.

const DRY = process.argv.includes("--dry");

const OLD = {
    projectId: "coffee-f70dc",
    apiKey: "AIzaSyAfcn90J0J_Y8kynjXhLd_9mdLeUo5wOdY"
};
const NEW = {
    projectId: "coffee-web-508305",
    apiKey: "AIzaSyDfYAWl3rDxWFIb56nNImGTWTJ9KWXSeTk",
    bucket: "coffee-web-508305.firebasestorage.app"
};

const firestoreUrl = (p) => `https://firestore.googleapis.com/v1/projects/${p.projectId}/databases/(default)/documents`;

async function listBeans(p) {
    const res = await fetch(`${firestoreUrl(p)}/beans?pageSize=300&key=${p.apiKey}`);
    if (!res.ok) throw new Error(`${p.projectId} 원두 목록 읽기 실패: ${res.status}`);
    const json = await res.json();
    return new Map((json.documents || []).map(d => [d.name.split("/").pop(), d.fields]));
}

async function restore() {
    const oldBeans = await listBeans(OLD);
    const newBeans = await listBeans(NEW);

    const targets = [];
    for (const [id, fields] of newBeans) {
        const oldUrl = oldBeans.get(id)?.imageUrl?.stringValue;
        if (!fields.imageUrl?.stringValue && oldUrl) targets.push({ id, name: fields.beanName?.stringValue, oldUrl });
    }
    console.log(`사진을 옮길 원두: ${targets.length}개${DRY ? " (--dry: 확인만 함)" : ""}`);

    let done = 0;
    for (const t of targets) {
        const img = await fetch(t.oldUrl);
        if (!img.ok) {
            const reason = img.status === 402 ? "옛 프로젝트 결제 계정이 연결되지 않음" : `HTTP ${img.status}`;
            console.log(`  ✗ ${t.name}: 다운로드 실패 (${reason})`);
            continue;
        }
        const contentType = img.headers.get("content-type") || "image/jpeg";
        const bytes = Buffer.from(await img.arrayBuffer());
        // 원래 파일명(coffee_images/xxx)을 그대로 사용
        const path = decodeURIComponent(new URL(t.oldUrl).pathname.split("/o/")[1]);

        if (DRY) {
            console.log(`  ○ ${t.name}: 다운로드 가능 (${(bytes.length / 1024).toFixed(0)}KB, ${contentType}) → ${path}`);
            continue;
        }

        const up = await fetch(
            `https://firebasestorage.googleapis.com/v0/b/${NEW.bucket}/o?name=${encodeURIComponent(path)}`,
            { method: "POST", headers: { "Content-Type": contentType }, body: bytes }
        );
        if (!up.ok) { console.log(`  ✗ ${t.name}: 업로드 실패 (HTTP ${up.status})`); continue; }
        const meta = await up.json();
        const newUrl = `https://firebasestorage.googleapis.com/v0/b/${NEW.bucket}/o/${encodeURIComponent(path)}?alt=media&token=${meta.downloadTokens}`;

        const patch = await fetch(
            `${firestoreUrl(NEW)}/beans/${t.id}?updateMask.fieldPaths=imageUrl&key=${NEW.apiKey}`,
            { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fields: { imageUrl: { stringValue: newUrl } } }) }
        );
        if (!patch.ok) { console.log(`  ✗ ${t.name}: 원두 정보 수정 실패 (HTTP ${patch.status})`); continue; }

        console.log(`  ✓ ${t.name}`);
        done++;
    }
    if (!DRY) console.log(`완료: ${done}/${targets.length}개`);
}

restore().catch(e => { console.error(e); process.exit(1); });
