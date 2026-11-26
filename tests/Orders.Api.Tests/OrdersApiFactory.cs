using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;

namespace Orders.Api.Tests;

// The keys live in the test host's configuration, as they would in appsettings,
// so the tests exercise the same path a deployment does.
public class OrdersApiFactory : WebApplicationFactory<Program>
{
    public const string AcmeKey = "test-key-acme";
    public const string GlobexKey = "test-key-globex";

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseSetting("ApiKeys:0:Key", AcmeKey);
        builder.UseSetting("ApiKeys:0:Client", "acme");
        builder.UseSetting("ApiKeys:1:Key", GlobexKey);
        builder.UseSetting("ApiKeys:1:Client", "globex");
    }

    public HttpClient CreateClient(string apiKey)
    {
        var client = CreateClient();
        client.DefaultRequestHeaders.Add("X-Api-Key", apiKey);
        return client;
    }
}
