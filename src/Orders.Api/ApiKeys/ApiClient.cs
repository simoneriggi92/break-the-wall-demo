namespace Orders.Api.ApiKeys;

/// <summary>A configured key and the client it identifies.</summary>
public sealed class ApiKeyEntry
{
    public string Key { get; set; } = "";

    public string Client { get; set; } = "";
}

/// <summary>The client a request's key identified, for the endpoints to scope their data.</summary>
public sealed record ApiClient(string Name);

public static class ApiClientHttpContextExtensions
{
    private static readonly object ItemKey = new();

    public static void SetApiClient(this HttpContext context, ApiClient client) =>
        context.Items[ItemKey] = client;

    // The middleware runs before every endpoint, so an endpoint that finds no client
    // means the pipeline was wired wrongly: fail loudly rather than serve anonymously.
    public static ApiClient GetApiClient(this HttpContext context) =>
        context.Items[ItemKey] as ApiClient
        ?? throw new InvalidOperationException("No API client on this request: is ApiKeyMiddleware registered?");
}
