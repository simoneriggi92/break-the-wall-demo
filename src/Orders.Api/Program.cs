using Orders.Api.ApiKeys;
using Orders.Api.Orders;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddProblemDetails();
builder.Services.Configure<List<ApiKeyEntry>>(builder.Configuration.GetSection("ApiKeys"));
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddSingleton<OrderStore>();

var app = builder.Build();

app.UseMiddleware<ApiKeyMiddleware>();
app.MapOrders();

app.Run();
