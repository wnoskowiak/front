import fetcher from "../../functions/fetcher";

function createMock(adress, body) {
    return fetcher(`http://localhost:3025/__proxy/set_mocks/`, {
        url: adress,
        content: JSON.parse(body),
    }).then((r) => r.status);
}

export default createMock;