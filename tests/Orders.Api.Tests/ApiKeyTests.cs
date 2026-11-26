using System.Net;

namespace Orders.Api.Tests;

public class ApiKeyTests(OrdersApiFactory factory) : IClassFixture<OrdersApiFactory>
{
    [Fact]
    public async Task A_request_without_a_key_is_refused()
    {
        var client = factory.CreateClient();

        var response = await client.GetAsync("/orders");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Theory]
    [InlineData("not-a-configured-key")]
    [InlineData("test-key-acm")]
    [InlineData("TEST-KEY-ACME")]
    public async Task A_request_with_an_unknown_key_is_refused(string key)
    {
        var client = factory.CreateClient(key);

        var response = await client.GetAsync("/orders");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task A_request_with_a_valid_key_is_served()
    {
        var client = factory.CreateClient(OrdersApiFactory.AcmeKey);

        var response = await client.GetAsync("/orders");

        // The host is shared by this class's tests, so only the status is asserted: what the
        // list holds belongs to OrderTests, which gives each test a fresh host.
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }
}
