const el = id => document.getElementById(id);

function evaluate() {
  const asset = el("quoteAsset").value;
  const a = Number(el("amount").value);
  const m = Number(el("maxTrade").value);
  const c = Number(el("costs").value);
  const p = Number(el("minProfit").value);
  const exit = Number(el("expectedExit").value);

  const d = el("decision");

  if (
    ![a, m, c, p, exit].every(Number.isFinite) ||
    a <= 0 || m <= 0 || c < 0 || p < 0 || exit < 0
  ) {
    d.textContent = "REJECT: invalid inputs.";
    return;
  }

  const requiredExit = a + c + p;
  const netProfit = exit - a - c;

  el("principal").textContent = a.toFixed(2) + " " + asset;
  el("costResult").textContent = c.toFixed(2) + " " + asset;
  el("expectedExitResult").textContent =
    exit.toFixed(2) + " " + asset;
  el("netProfitResult").textContent =
    netProfit.toFixed(2) + " " + asset;
  el("exitResult").textContent =
    requiredExit.toFixed(2) + " " + asset;

  if (a > m) {
    d.textContent = "REJECT: maximum trade size exceeded.";
  } else if (netProfit < p) {
    d.textContent =
      "REJECT: expected net profit is below the configured minimum.";
  } else {
    d.textContent =
      "SIMULATION ONLY: arithmetic threshold passed. " +
      "Live quote, freshness, slippage and execution checks are still required.";
  }
}

el("evaluate").addEventListener("click", evaluate);
el("quoteAsset").addEventListener("change", evaluate);
evaluate();

fetch("/api/health")
  .then(response => response.json())
  .then(data => {
    el("health").textContent =
      data.status === "ok"
        ? "DEPLOYMENT HEALTH · OK"
        : "HEALTH UNKNOWN";
  })
  .catch(() => {
    el("health").textContent = "HEALTH UNKNOWN";
  });