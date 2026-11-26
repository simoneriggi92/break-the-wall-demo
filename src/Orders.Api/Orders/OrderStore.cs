using System.Collections.Concurrent;

namespace Orders.Api.Orders;

public sealed record Order(Guid Id, string Client, string Product, int Quantity, DateTimeOffset PlacedAt);

// In memory on purpose: the demo is about the API's edges, not its storage, and a
// process restart emptying the orders is an acceptable cost for a project nobody deploys.
public sealed class OrderStore(TimeProvider clock)
{
    private readonly ConcurrentDictionary<Guid, Order> orders = new();

    public Order Place(string client, string product, int quantity)
    {
        var order = new Order(Guid.NewGuid(), client, product, quantity, clock.GetUtcNow());
        orders[order.Id] = order;
        return order;
    }

    // A client asking for another client's order gets nothing, as if it did not exist.
    public Order? Find(string client, Guid id) =>
        orders.TryGetValue(id, out var order) && order.Client == client ? order : null;

    // Removing the exact pair found, not just the id, keeps the ownership check and the
    // removal one step: nothing can swap the order in between.
    public bool Cancel(string client, Guid id) =>
        Find(client, id) is { } order && orders.TryRemove(new KeyValuePair<Guid, Order>(id, order));

    public IReadOnlyList<Order> List(string client) =>
        orders.Values
            .Where(order => order.Client == client)
            .OrderBy(order => order.PlacedAt)
            .ToList();
}
