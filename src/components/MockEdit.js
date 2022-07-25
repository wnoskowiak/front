import React from "react";
import fetcher from "../functions/fetcher";

function getActiveMocks(newAim) {
  return fetcher(`http://localhost:3025/__proxy/get_mocks/`, {}).then((r) =>
    r.json()
  );
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

export default BB;
