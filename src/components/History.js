import React from "react";
import fetcher from "../functions/fetcher";
import createMock from "./fetchers/createMock";

function fetchHistory(rec, id) {
  return fetcher(`http://localhost:3025/__proxy/history/`, {
    records: rec,
    id: id,
  }).then((r) => r.json());
}

function Body({ body }) {
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

function History({ data, handler }) {
  const res = [...data].reverse().map((record, i) => (
    <li key={i}>
      <div id="record" className="record" key={i}>
        <h3>{record.id}</h3>
        <div id="request" className="request">
          <div>
            nadawca: <pre>{record.request.from}</pre>
          </div>
          <div id="url">
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
        <div id="reply" className="reply">
          <div>
            status: <pre>{record.reply.status}</pre>
          </div>
          <div id="replyData">
            data: <pre>{record.reply.date}</pre>
          </div>
          <Body body={record.reply} />
        </div>
        <button onClick={() => handler(record)}>utwórz mock</button>
      </div>
    </li>
  ));
  return <ul>{res}</ul>;
}

function DD() {
  const [history, setHistory] = React.useState("");

  function handleHistoryRequest(event) {
    event.preventDefault();
    fetchHistory(
      event.target.elements.numOfRecords.value,
      event.target.elements.recordID.value
    ).then((dat) => setHistory(dat));
  }

  function handleAddMock(record) {
    var url = record.request.url
    var bod = "{}"
    if(!(record.reply.body === undefined)){
      if(record.reply.body.isJSON) {
        bod = JSON.stringify(record.reply.body.content, null, 2)
      }
    }
    createMock(url,bod)
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
      <History data={history} handler={handleAddMock} />
    </div>
  );
}

export default DD;
