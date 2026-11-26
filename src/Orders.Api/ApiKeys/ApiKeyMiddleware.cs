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

        var presentedHash = SHA256.HashData(Encoding.UTF8.GetBytes(presented));
        ApiKeyEntry? match = null;

        // FixedTimeEquals returns at once on inputs of different lengths, so the keys are
        // compared as hashes, always 32 bytes: the time taken reveals neither how much of a
        // key was right nor how long the keys are. The loop never stops early, for the same reason.
        foreach (var entry in keys.CurrentValue)
        {
            var configuredHash = SHA256.HashData(Encoding.UTF8.GetBytes(entry.Key));
            if (CryptographicOperations.FixedTimeEquals(presentedHash, configuredHash))
            {
                match = entry;
            }
        }

        return match;
    }
}
