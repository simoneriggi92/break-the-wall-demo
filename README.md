# Break the Wall demo: an orders API

This is the project behind [Break the Wall](https://github.com/simoneriggi92/BreakTheWall)'s media. The GIF and clips in its README are a real Claude Code session that grills the ticket below in this repository, answers its rounds one question at a time, and checks the spec it leads to.

It is a small ASP.NET Core minimal API on .NET 10. Clients identify themselves with an API key and place, read and cancel their own orders. It works, it is tested, and it is missing one thing on purpose.

## The ticket to grill

> **Add rate limiting per API key**
>
> One client can send as many requests as it likes. A misbehaving integration can starve every other client, and nothing in the API notices. Each API key should get a limited number of requests, and a client over its limit should be told so and when to try again, without affecting the others.

The ticket says what is wrong and leaves the decisions open: the limits and whether they differ per key, the counting window, where the counts live, which endpoints count, and what a refused client receives. Those are what the grilling is for.

The person's choices for a recorded take are written down in [docs/take.md](docs/take.md), so every take tells the same story whatever words the agent uses.

## The API

| Method | Path | Does |
| --- | --- | --- |
| `GET` | `/orders` | Lists the client's orders |
| `GET` | `/orders/{id}` | Reads one of the client's orders |
| `POST` | `/orders` | Places an order: `{ "product": "…", "quantity": 1 }` |
| `DELETE` | `/orders/{id}` | Cancels one of the client's orders |

Every request carries an `X-Api-Key` header holding one of the keys in the `ApiKeys` configuration section. A request without a valid key gets `401`. A client never sees another client's orders: they answer `404`, as if they did not exist. Orders live in memory and are gone when the process stops.

## Run it

You need the [.NET 10 SDK](https://dotnet.microsoft.com/download/dotnet/10.0).

```sh
dotnet test
dotnet run --project src/Orders.Api
```

In Development the API listens on `http://localhost:5073` and accepts two demo keys, from `appsettings.Development.json`:

```sh
curl -i http://localhost:5073/orders                                  # 401
curl -i -H "X-Api-Key: demo-key-acme" http://localhost:5073/orders    # 200, []
curl -i -H "X-Api-Key: demo-key-acme" -H "Content-Type: application/json" \
  -d '{"product":"Espresso beans","quantity":3}' http://localhost:5073/orders
```

The demo keys are public and only for running the project on your machine.

## Specs and tickets

The agent's skills ([mattpocock/skills](https://github.com/mattpocock/skills)) are set up for a local tracker: a spec is written as a file under `.scratch/<feature>/`, not as a GitHub issue. See [CLAUDE.md](CLAUDE.md) and [docs/agents/](docs/agents/).

## Licence

[MIT](LICENSE).
