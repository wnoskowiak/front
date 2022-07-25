function fetcher(addr, body) {
  return window.fetch(addr, {
    method: "POST",
    headers: {
      "Content-Type": "application/json;charset=UTF-8",
    },
    body: JSON.stringify(body),
  });
}

export default fetcher;
