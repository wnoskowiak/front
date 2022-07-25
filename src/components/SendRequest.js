import React from "react";
import fetcher from "../functions/fetcher";

function fetchReply(reqe, adress) {
  return fetcher(
    `http://localhost:3025/${adress}`,
    JSON.parse(reqe)
  ).then((r) => r.json());
}

function InsomniaLike({ input }) {
  const [uuu, setUuu] = React.useState(null);

  React.useEffect(() => {
    if (!input.request) {
      return;
    }
    fetchReply(input.request, input.adress).then((dat) => {
      setUuu(dat);
    });
  }, [input]);

  if (!input.request) {
    return "wpisz zapytanie";
  }

  if (!uuu) {
    return "...";
  }

  return <pre>{JSON.stringify(uuu, null, 2)}</pre>;
}

function AA() {
  const [insInput, setInsInput] = React.useState({ request: "", adress: "" });

  function handleRequestSubmit(event) {
    event.preventDefault();
    setInsInput({
      ...insInput,
      request: event.target.elements.request.value,
      adress: event.target.elements.adress.value,
    });
  }

  return (
    <div>
      <h2>Miejsce do nadawania requestów</h2>
      <form onSubmit={handleRequestSubmit}>
        <label htmlFor="adress">adres</label>
        <div>
          <input id="adress" />
        </div>
        <label htmlFor="request">treść zapytania</label>
        <div>
          <input id="request" />
          <button type="submit">wyślij</button>
        </div>
      </form>
      <hr />
      <InsomniaLike input={insInput} />
    </div>
  );
}

export default AA;
