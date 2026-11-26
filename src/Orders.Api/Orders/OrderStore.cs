using System.Collections.Concurrent;

namespace Orders.Api.Orders;

public sealed record Order(Guid Id, string Client, string Product, int Quantity, DateTimeOffset PlacedAt);

public sealed class OrderStore(TimeProvider clock)
{
    private readonly ConcurrentDictionary<Guid, Order> orders = new();

    public Order Place(string client, string product, int quantity)
    {
        var order = new Order(Guid.NewGuid(), client, product, quantity, clock.GetUtcNow());
        orders[order.Id] = order;
        return order;
    }

    // Another client's order is answered as missing, not forbidden, so a client cannot
    // learn which order ids exist by probing them.
    public Order? Find(string client, Guid id) =>
        orders.TryGetValue(id, out var order) && order.Client == client ? order : null;

    // Removing the exact pair found ties the removal to the ownership check just made.
    public bool Cancel(string client, Guid id) =>
        Find(client, id) is { } order && orders.TryRemove(new KeyValuePair<Guid, Order>(id, order));

    public IReadOnlyList<Order> List(string client) =>
        orders.Values
            .Where(order => order.Client == client)
            .OrderBy(order => order.PlacedAt)
            .ToList();
}
