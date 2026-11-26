using System.Net;
using System.Net.Http.Json;

namespace Orders.Api.Tests;

public sealed class OrderTests : IDisposable
{
    private sealed record PlacedOrder(Guid Id, string Product, int Quantity, DateTimeOffset PlacedAt);

    // A fresh host per test, so orders placed by one test never show up in another.
    private readonly OrdersApiFactory factory = new();

    public void Dispose() => factory.Dispose();

    private static async Task<Uri> PlaceAsync(HttpClient client, string product, int quantity = 1)
    {
        var placed = await client.PostAsJsonAsync("/orders", new { product, quantity });
        Assert.Equal(HttpStatusCode.Created, placed.StatusCode);
        return placed.Headers.Location ?? throw new InvalidDataException("no Location header");
    }

    [Fact]
    public async Task A_placed_order_can_be_read_back()
    {
        var client = factory.CreateClient(OrdersApiFactory.AcmeKey);

        var location = await PlaceAsync(client, "Espresso beans", quantity: 3);

        var read = await client.GetFromJsonAsync<PlacedOrder>(location);

        Assert.NotNull(read);
        Assert.Equal("Espresso beans", read.Product);
        Assert.Equal(3, read.Quantity);
    }

    [Fact]
    public async Task Orders_are_listed_in_the_order_they_were_placed()
    {
        var client = factory.CreateClient(OrdersApiFactory.AcmeKey);
        string[] products = ["Kettle", "Scale", "Grinder", "Filter papers", "Espresso beans"];
        foreach (var product in products)
        {
            await PlaceAsync(client, product);
        }

        var listed = await client.GetFromJsonAsync<List<PlacedOrder>>("/orders");

        Assert.Equal(products, (listed ?? throw new InvalidDataException()).Select(order => order.Product));
    }

    [Theory]
    [InlineData(null, 1)]
    [InlineData("  ", 1)]
    [InlineData("Espresso beans", 0)]
    [InlineData("Espresso beans", -2)]
    public async Task An_invalid_order_is_refused_and_not_placed(string? product, int quantity)
    {
        var client = factory.CreateClient(OrdersApiFactory.AcmeKey);

        var placed = await client.PostAsJsonAsync("/orders", new { product, quantity });
        var listed = await client.GetFromJsonAsync<List<PlacedOrder>>("/orders");

        Assert.Equal(HttpStatusCode.BadRequest, placed.StatusCode);
        Assert.Empty(listed ?? throw new InvalidDataException());
    }

    [Fact]
    public async Task One_clients_orders_are_invisible_to_another()
    {
        var acme = factory.CreateClient(OrdersApiFactory.AcmeKey);
        var globex = factory.CreateClient(OrdersApiFactory.GlobexKey);
        var location = await PlaceAsync(acme, "Filter papers");

        var read = await globex.GetAsync(location);
        var listed = await globex.GetFromJsonAsync<List<PlacedOrder>>("/orders");

        Assert.Equal(HttpStatusCode.NotFound, read.StatusCode);
        Assert.Empty(listed ?? throw new InvalidDataException());
    }

    [Fact]
    public async Task A_cancelled_order_is_gone_and_only_its_owner_can_cancel_it()
    {
        var acme = factory.CreateClient(OrdersApiFactory.AcmeKey);
        var globex = factory.CreateClient(OrdersApiFactory.GlobexKey);
        var location = await PlaceAsync(acme, "Grinder");

        var byAnother = await globex.DeleteAsync(location);
        var byOwner = await acme.DeleteAsync(location);
        var readAfter = await acme.GetAsync(location);

        Assert.Equal(HttpStatusCode.NotFound, byAnother.StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, byOwner.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, readAfter.StatusCode);
    }
}
