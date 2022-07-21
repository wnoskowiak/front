import "./App.css";
import React from "react";

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

function AimOptions({ data, id, handler }) {
  console.log(data);

  if (!data) {
    return;
  }
  return (
    <select id={id} name="aims" onChange={handler} defaultValue={data.current}>
      {Object.keys(data.available).map((key) => (
        <option value={key}>{key}</option>
      ))}
    </select>
  );
}

function CurrentAim({ data }) {
  if (!data) {
    return;
  }
  const currAim = (
    <div>
      Aktualnie celuję w: <pre>{data.current}</pre>
    </div>
  );
  // delete data.DEFAULT
  const available = (
    <div>
      Dostępne cele:{" "}
      <ul>
        {Object.keys(data.available).map((key) => (
          <li key={key}>
            <ul>
              <li>{key}</li>
              <li>{data.available[key]}</li>
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
  return (
    <div>
      {currAim}
      {available}
    </div>
  );
}

function MocksOnOff({ data, handler }) {
  return (
    <ul>
      {Object.keys(data).map((key) => (
        <li key={key}>
          <input
            type="checkbox"
            checked={data[key]}
            onChange={handler}
            name={key}
          />
          {key}
        </li>
      ))}
    </ul>
  );
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

localStorage.setItem("requestHistory", []);

function EditMocks({ body, slug }) {
  const [val, setVal] = React.useState(null);

  React.useEffect(() => {
    if (!body) {
      return;
    }
    createMock(slug, body).then((dat) => {
      if (dat === 200) {
        setVal("OK");
      } else {
        setVal("coś nie wyszło");
      }
    });
  }, [body, slug]);

  if (!body) {
    return "wpisz dane";
  }

  if (!val) {
    return "...";
  }

  return <pre>{val}</pre>;
}

function HasAimChanged({ nAim }) {
  const [val, setVal] = React.useState(null);

  React.useEffect(() => {
    if (!nAim) {
      return;
    }
    editCurrentAim(nAim).then((dat) => {
      if (dat === 200) {
        setVal("OK");
      } else {
        setVal("coś nie wyszło");
      }
    });
  }, [nAim]);

  if (!nAim) {
    return;
  }

  if (!val) {
    return;
  }

  return <pre>{val}</pre>;
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

function BB() {
  const [slug, setSlug] = React.useState("");
  const [sendBody, setSendBody] = React.useState("");
  const [err, setErr] = React.useState("False");
  const [body, setBody] = React.useState("");
  const [uu, setUu] = React.useState("");

  React.useEffect(() => {
    getActiveMocks().then((dat) => setUu(dat));
  }, [sendBody, slug]);

  function handleMockVisEdit(event) {
    event.preventDefault();
    modMock(event.target.name, event.target.checked);
    getActiveMocks().then((dat) => setUu(dat));
  }

  function handleBodyChange(event) {
    event.preventDefault();
    setBody(event.target.value);
  }

  function handleMockSubmit(event) {
    event.preventDefault();
    setSlug(event.target.elements.slug.value);
    setSendBody(body);
  }

  function JSONchecker({ body }) {
    if (body === "") {
      return;
    }
    try {
      JSON.parse(body);
      setErr(false);
      return <div style={{ color: "green" }}>OK</div>;
    } catch (e) {
      setErr(true);
      return <div style={{ color: "red" }}>niepoprawny JSON</div>;
    }
  }

  return (
    <div>
      <div>
        <h2>Miejsce do ustaniwania mocków odpowiedzi</h2>
        <form onSubmit={handleMockSubmit}>
          <label htmlFor="slug">ścieżka do nowego mocka</label>
          <div>
            <input id="slug" />
          </div>
          <label htmlFor="body">treść mocka</label>
          <div>
            <input id="body" onChange={handleBodyChange} />
            <button disabled={err} type="submit">
              wyślij
            </button>
            <JSONchecker body={body} />
          </div>
        </form>
        <hr />
        <EditMocks body={sendBody} slug={slug} />
      </div>
      <div>
        <h2>Aktywne Mocki</h2>
        <MocksOnOff data={uu} handler={handleMockVisEdit} />
        <hr />
      </div>
    </div>
  );
}

function CC() {
  const [currAim, setCurrAim] = React.useState(null);
  const [aim, setAim] = React.useState("");

  React.useEffect(() => {
    fetchCurrentAim().then((dat) => setCurrAim(dat));
  }, [aim]);

  function handleConfigChange(event) {
    event.preventDefault();
    setAim(event.target.value);
  }

  return (
    <div>
      <h2>Edycja konfiguracji</h2>
      <form onSubmit={handleConfigChange}>
        <label htmlFor="aim">backend w który celuje proxy</label>
        <div>
          <AimOptions data={currAim} id="aim" handler={handleConfigChange} />
        </div>
      </form>
      <hr />
      <HasAimChanged nAim={aim} />
      <hr />
      <div>
        <CurrentAim data={currAim} />
      </div>
    </div>
  );
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

function fetcher(addr, body) {
  return window.fetch(addr, {
    method: "POST",
    headers: {
      "Content-Type": "application/json;charset=UTF-8",
    },
    body: JSON.stringify(body),
  });
}

function fetchReply(reqe, adress) {
  return fetcher(
    `http://localhost:3025/${adress}`,
    JSON.parse(reqe)
  ).then((r) => r.json());
}

function modMock(mock, state) {
  var dat = {};
  dat[mock] = state;
  return fetcher(`http://localhost:3025/__proxy/edit_mocks/`, {
    visibility: dat,
  });
}

function createMock(adress, body) {
  return fetcher(`http://localhost:3025/__proxy/set_mocks/`, {
    url: adress,
    content: JSON.parse(body),
  }).then((r) => r.status);
}

function fetchHistory(rec, id) {
  return fetcher(`http://localhost:3025/__proxy/history/`, {
    records: rec,
    id: id,
  }).then((r) => r.json());
}

function fetchCurrentAim() {
  return fetcher(`http://localhost:3025/__proxy/aims/`, {}).then((r) =>
    r.json()
  );
}

function editCurrentAim(newAim) {
  return fetcher(`http://localhost:3025/__proxy/change_aim/`, {
    aim: newAim,
  }).then((r) => r.status);
}

function getActiveMocks(newAim) {
  return fetcher(`http://localhost:3025/__proxy/get_mocks/`, {}).then((r) =>
    r.json()
  );
}

function App() {
  function CurrentView({ num }) {
    console.log(typeof num);
    if (num === "1") {
      return <AA />;
    }
    if (num === "2") {
      return <BB />;
    }
    if (num === "3") {
      return <CC />;
    }
    if (num === "4") {
      return <DD />;
    }
  }

  const [chosen, setChosen] = React.useState("1");

  function handleChange(event) {
    setChosen(event.target.value);
  }

  return (
    <div>
      <div>
        <select name="choice" onChange={handleChange}>
          <option value="1">wysyłanie requestów</option>
          <option value="2">tworzenie i edycja mocków</option>
          <option value="3">edycja konfiguracji</option>
          <option value="4">podgląd historii</option>
        </select>
        <hr />
      </div>
      <div>
        <CurrentView num={chosen} />
      </div>
    </div>
  );
}

export default App;
