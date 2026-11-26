using Orders.Api.ApiKeys;

namespace Orders.Api.Orders;

public sealed record PlaceOrder(string? Product, int Quantity)
{
    public Dictionary<string, string[]> ValidationErrors()
    {
        var errors = new Dictionary<string, string[]>();
        if (string.IsNullOrWhiteSpace(Product))
        {
            errors[nameof(Product)] = ["A product is required."];
        }

        if (Quantity < 1)
        {
            errors[nameof(Quantity)] = ["The quantity must be at least 1."];
        }

        return errors;
    }
}

public sealed record OrderView(Guid Id, string Product, int Quantity, DateTimeOffset PlacedAt)
{
    public static OrderView From(Order order) => new(order.Id, order.Product, order.Quantity, order.PlacedAt);
}

public static class OrderEndpoints
{
    public static IEndpointRouteBuilder MapOrders(this IEndpointRouteBuilder routes)
    {
        var orders = routes.MapGroup("/orders");

        orders.MapGet("/", (HttpContext context, OrderStore store) =>
            Results.Ok(store.List(context.GetApiClient().Name).Select(OrderView.From)));

        orders.MapGet("/{id:guid}", (Guid id, HttpContext context, OrderStore store) =>
            store.Find(context.GetApiClient().Name, id) is { } order
                ? Results.Ok(OrderView.From(order))
                : Results.NotFound());

        orders.MapPost("/", (PlaceOrder request, HttpContext context, OrderStore store) =>
        {
            var errors = request.ValidationErrors();
            if (errors.Count > 0)
            {
                return Results.ValidationProblem(errors);
            }

            var order = store.Place(context.GetApiClient().Name, request.Product!, request.Quantity);
            return Results.Created($"/orders/{order.Id}", OrderView.From(order));
        });

        orders.MapDelete("/{id:guid}", (Guid id, HttpContext context, OrderStore store) =>
            store.Cancel(context.GetApiClient().Name, id) ? Results.NoContent() : Results.NotFound());

        return routes;
    }
}
