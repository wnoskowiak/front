import React from "react";
import fetcher from "../functions/fetcher";

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

function AimOptions({ data, id, handler }) {
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

function CC() {
  const [currAim, setCurrAim] = React.useState(null);
  const [aim, setAim] = React.useState("");

  React.useEffect(() => {
    fetchCurrentAim().then((dat) => {setCurrAim(dat)});
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

export default CC;
