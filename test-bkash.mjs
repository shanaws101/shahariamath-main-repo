async function testBkash() {
  console.log("Testing bKash Sandbox...");
  const res = await fetch("https://tokenized.sandbox.bka.sh/v1.2.0-beta/tokenized/checkout/token/grant", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      username: "sandboxTokenizedUser02",
      password: "sandboxTokenizedUser02@12345",
    },
    body: JSON.stringify({
      app_key: "4f6o0cjiki2rfm34kfdaml1eqq",
      app_secret: "2is7hdkoa6vr8iifbgj4d11qamgjc0vdh19d1bqkrs95q8c1i1g"
    })
  });
  
  console.log("Status:", res.status);
  const text = await res.text();
  console.log("Body:", text);
}
testBkash();
