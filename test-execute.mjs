async function testBkash() {
  const paymentID = "TR0011PsGfvFs1783624771066";
  const grantRes = await fetch("https://tokenized.sandbox.bka.sh/v1.2.0-beta/tokenized/checkout/token/grant", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      username: "sandboxTokenizedUser02",
      password: "sandboxTokenizedUser02@12345",
    },
    body: JSON.stringify({
      app_key: "4f6o0cjiki2rfm34kfdadl1eqq",
      app_secret: "2is7hdktrekvrbljjh44ll3d9l1dtjo4pasmjvs5vl5qr3fug4b"
    })
  });
  
  const grantData = await grantRes.json();
  const token = grantData.id_token;
  console.log("Token:", token ? "OK" : grantData);

  const res = await fetch("https://tokenized.sandbox.bka.sh/v1.2.0-beta/tokenized/checkout/execute", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: token,
      "X-App-Key": "4f6o0cjiki2rfm34kfdadl1eqq",
    },
    body: JSON.stringify({ paymentID })
  });
  
  console.log("Execute Status:", res.status);
  const text = await res.text();
  console.log("Execute Body:", text);
}
testBkash();
