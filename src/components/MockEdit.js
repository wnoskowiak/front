import React from "react";
import fetcher from "../functions/fetcher";
import createMock from "./fetchers/createMock";

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

function EditMocks({ body, slug, handler }) {
  const [uu, setUu] = React.useState("");
  const [val, setVal] = React.useState("wpisz dane");

  function handleMockVisEdit(event) {
    event.preventDefault();
    modMock(event.target.name, event.target.checked);
    getActiveMocks().then((dat) => setUu(dat));
  }

  React.useEffect(() => {
    getActiveMocks().then((dat) => setUu(dat))
  },[val])

  React.useEffect(() => {
    if (!body) {
      return;
    }
    createMock(slug, body).then((dat) => {
      if (dat === 200) {
        setVal("OK");
        // getActiveMocks().then((dat) => setUu(dat))
      } else {
        setVal("coś nie wyszło");
      }

    });
  }, [body, slug]);

  if (!body) {
    // setVal("wpisz dane");
    // getActiveMocks().then((dat) => setUu(dat))
  }

  // if (!val) {
  //   setVal("...");
  // }

  return <div>
    <div>
      <pre>{val}</pre>
    </div>
    <div>
      <h2>Aktywne Mocki</h2>
      <MocksOnOff data={uu} handler={handleMockVisEdit} />
      <hr />
    </div>
  </div>

  // return <pre>{val}</pre>;
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

  function handleMockVisEdit(event) {
    event.preventDefault();
    modMock(event.target.name, event.target.checked);
    // getActiveMocks().then((dat) => setUu(dat));
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
      </div>
      <div>
          <EditMocks body={sendBody} slug={slug} />
      </div>
    </div>
  );
}

export default BB;
