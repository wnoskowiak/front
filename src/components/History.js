import React from "react";
import fetcher from "../functions/fetcher";

function fetchHistory(rec, id) {
  return fetcher(`http://localhost:3025/__proxy/history/`, {
    records: rec,
    id: id,
  }).then((r) => r.json());
}

function Body({ body }) {
  console.log(body);
  if (!(body.body === undefined)) {
    if (body.body.isJSON) {
      return (
        <div>
          treść:<pre>{JSON.stringify(body.body.content, null, 2)}</pre>
        </div>
      );
    }
    return (
      <div>
        treść:<pre>{body.content}</pre>
      </div>
    );
  }
  return;
}

function History({ data }) {
  const res = [...data].map((record, i) => (
    <li key={i}>
      <div class="record" key={i}>
        <h3>{record.id}</h3>
        <div class="request">
          <div>
            nadawca: <pre>{record.request.from}</pre>
          </div>
          <div>
            URL: <pre>{record.request.url}</pre>
          </div>
          <div>
            data: <pre>{record.request.date}</pre>
          </div>
          <div>
            treść
            <pre>{JSON.stringify(record.request.body, null, 2)}</pre>
          </div>
        </div>
        <div class="reply">
          <div>
            status: <pre>{record.reply.status}</pre>
          </div>
          <div>
            data: <pre>{record.reply.date}</pre>
          </div>
          <Body body={record.reply} />
        </div>
      </div>
    </li>
  ));
  return <ul>{res}</ul>;
}

function DD() {
  const [history, setHistory] = React.useState("");

  function handleHistoryRequest(event) {
    event.preventDefault();
    console.log(event.target.elements.numOfRecords.value);
    console.log(event.target.elements.recordID.value);
    fetchHistory(
      event.target.elements.numOfRecords.value,
      event.target.elements.recordID.value
    ).then((dat) => setHistory(dat));
  }

  return (
    <div>
      <h2>Odczyt historii</h2>
      <form onSubmit={handleHistoryRequest}>
        <label htmlFor="numOfRecords">Ilość rekordów</label>
        <div>
          <input id="numOfRecords" />
        </div>
        <label htmlFor="recordID">szukany element rekordu</label>
        <div>
          <input id="recordID" />
        </div>
        <div>
          <button type="submit">sciągnij historię</button>
        </div>
      </form>
      <hr />
      <History data={history} />
    </div>
  );
}

export default DD;
