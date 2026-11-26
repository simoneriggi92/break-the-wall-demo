using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Options;

namespace Orders.Api.ApiKeys;

public sealed class ApiKeyMiddleware(RequestDelegate next, IOptionsMonitor<List<ApiKeyEntry>> keys)
{
    public const string HeaderName = "X-Api-Key";

    public async Task InvokeAsync(HttpContext context)
    {
        var presented = context.Request.Headers[HeaderName].ToString();
        var entry = Find(presented);

        if (entry is null)
        {
            await Results.Problem(
                    statusCode: StatusCodes.Status401Unauthorized,
                    title: "A valid API key is required.",
                    detail: $"Send one of the configured keys in the {HeaderName} header.")
                .ExecuteAsync(context);
            return;
        }

        context.SetApiClient(new ApiClient(entry.Client));
        await next(context);
    }

    private ApiKeyEntry? Find(string presented)
    {
        if (presented.Length == 0)
        {
            return null;
        }

        var presentedBytes = Encoding.UTF8.GetBytes(presented);
        ApiKeyEntry? match = null;

        // Every configured key is compared in constant time, and the loop never stops
        // early, so the response time does not reveal how much of a key was right.
        foreach (var entry in keys.CurrentValue)
        {
            var configured = Encoding.UTF8.GetBytes(entry.Key);
            if (CryptographicOperations.FixedTimeEquals(presentedBytes, configured))
            {
                match = entry;
            }
        }

        return match;
    }
}
