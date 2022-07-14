import './App.css';
import React from 'react';

function Body({ body }) {
  if (!(body.body === undefined)) {
    if (body.isJSON) {
      return <div>treść:<pre>{JSON.stringify(body.content, null, 2)}</pre></div>
    }
    return <div>treść:<pre>{body.content}</pre></div>
  }
  return
}

function CurrentAim({ data }) {
  if (!data) {
    return
  }
  const currAim = <div>Aktualnie celuję w: <pre>{data.DEFAULT}</pre></div>
  delete data.DEFAULT
  const available = <div>Dostępne cele: <ul>{Object.keys(data).map((key) =>
    <li key = {key}>
      <ul><li>{key}</li><li>{data[key]}</li></ul>
    </li>
  )}</ul></div>
  return <div>{currAim}{available}</div>
}


function History({ data }) {

  const res = [...data].map((record, i) =>
    <li>
      <div class="record" key={i} >
        <div class="request">
          <div>
            nadawca:  <pre>{record.request.from}</pre>
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
            status:  <pre>{record.reply.status}</pre>
          </div>
          <div>
            data: <pre>{record.reply.date}</pre>
          </div>
          <Body body={record.reply} />
        </div>
      </div>
    </li>
  )
  return <ul>{res}</ul>
}

function InsomniaLike({ input }) {
  const [uuu, setUuu] = React.useState(null)

  React.useEffect(() => {
    if (!input.request) {
      return
    }
    fetchReply(input.request, input.adress).then(dat => {
      setUuu(dat)
    })
  }, [input]
  )

  if (!input.request) {
    return 'wpisz zapytanie'
  }

  if (!uuu) {
    return '...'
  }

  return <pre>{JSON.stringify(uuu, null, 2)}</pre>
}

localStorage.setItem("requestHistory", [])

function EditMocks({ body, slug }) {

  const [val, setVal] = React.useState(null)

  React.useEffect(() => {
    if (!body) {
      return
    }
    createMock(slug, body).then(dat => {
      if (dat === 200) {
        setVal("OK")
      }
      else {
        setVal("coś nie wyszło")
      }
    })
  }, [body, slug]
  )

  if (!body) {
    return 'wpisz dane'
  }

  if (!val) {
    return '...'
  }

  return <pre>{val}</pre>
}

function HasAimChanged({ nAim }) {

  const [val, setVal] = React.useState(null)

  React.useEffect(() => {
    if (!nAim) {
      return
    }
    editCurrentAim(nAim).then(dat => {
      if (dat === 200) {
        setVal("OK")
      }
      else {
        setVal("coś nie wyszło")
      }
    })
  }, [nAim]
  )

  if (!nAim) {
    return
  }

  if (!val) {
    return
  }

  return <pre>{val}</pre>
}

function App() {
  const [insInput, setInsInput] = React.useState({ request: '', adress: '' })
  const [slug, setSlug] = React.useState('')
  const [aim, setAim] = React.useState('')
  const [body, setBody] = React.useState('')
  const [sendBody, setSendBody] = React.useState('')
  const [history, setHistory] = React.useState('')
  const [err, setErr] = React.useState('False')
  const [init, setInit] = React.useState(true)
  const [currAim, setCurrAim] = React.useState(null)

  if (init) {
    fetchCurrentAim().then(dat => setCurrAim(dat))
    setInit(false)
  }

  function JSONchecker({ body }) {
    if (body === '') {
      return
    }
    try {
      JSON.parse(body);
      setErr(false)
      return <div style={{ color: 'green' }}>OK</div>
    } catch (e) {
      setErr(true)
      return <div style={{ color: 'red' }}>niepoprawny JSON</div>
    }
  }

  function handleRequestSubmit(event) {
    event.preventDefault()
    setInsInput({
      ...insInput,
      request: event.target.elements.request.value,
      adress: event.target.elements.adress.value
    })
  }

  function handleMockSubmit(event) {
    event.preventDefault()
    setSlug(event.target.elements.slug.value)
    setSendBody(body)
  }

  function handleConfigChange(event) {
    event.preventDefault()
    setAim(event.target.elements.aim.value)
  }

  function handleConfigRefresh(event) {
    event.preventDefault()
    fetchCurrentAim().then(dat => setCurrAim(dat))
  }


  function handleBodyChange(event) {
    event.preventDefault()
    setBody(event.target.value)
  }

  function handleHistoryRequest(event) {
    event.preventDefault()
    fetchHistory().then(dat => setHistory(dat))
  }

  return (
    <div>
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
      <hr />
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
            <button disabled={err} type="submit">wyślij</button>
            <JSONchecker body={body} />
          </div>
        </form>
        <hr />
        <EditMocks body={sendBody} slug={slug} />
      </div>
      <hr />
      <div>
        <h2>Edycja konfiguracji</h2>

        <form onSubmit={handleConfigChange}>
          <label htmlFor="aim">backend w który celuje proxy</label>
          <div>
            <input id="aim" />
            <button type="submit">wyślij</button>
          </div>
        </form>
        <hr />
        <HasAimChanged nAim={aim} />
        <hr />
        <form onSubmit={handleConfigRefresh}>
          <div>
          <button type="submit">odświerz dostępne konfiguracje</button>
          <CurrentAim data={currAim} />   
        </div>
        </form>
      </div>
      <hr />
      <div>
        <h2>Odczyt historii</h2>
        <form onSubmit={handleHistoryRequest}>
          <div>
            <button type="submit">sciągnij historię</button>
          </div>
        </form>
        <hr />
        <History data={history} />
      </div>
    </div>
  );
}

function fetcher(addr, body) {
  return window.fetch(addr, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json;charset=UTF-8',
    },
    body: JSON.stringify(body),
  }
  )
}

function fetchReply(reqe, adress) {
  return fetcher(`http://localhost:3025/${adress}`, JSON.parse(reqe)).then(r => r.json())
}

function createMock(adress, body) {
  return fetcher(`http://localhost:3025/set_mocks/`, { "url": adress, "content": JSON.parse(body) }).then(r => r.status)
}

function fetchHistory() {
  return fetcher(`http://localhost:3025/history/`, {}).then(r => r.json())
}

function fetchCurrentAim() {
  return fetcher(`http://localhost:3025/aims/`, {}).then(r => r.json())
}

function editCurrentAim(newAim) {
  return fetcher(`http://localhost:3025/change_aim/`, { "aim": newAim }).then(r => r.status)
}


export default App;
