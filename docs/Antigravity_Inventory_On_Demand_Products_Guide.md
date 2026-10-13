# Inventory & On-Demand Product Management
## Complete Antigravity Implementation Guide

**Document Type:** Technical Product & ERP Specification  
**Purpose:** Inventory, warehouse, production, transfer, reservation, and sales-time assembly  
**Implementation Target:** Antigravity / AI Software Development Agent

---

# 1. Business Requirement

The system has three primary product categories:

1. **Raw Materials**
2. **Factory Products / Semi-Finished Products**
3. **Branch Products / On-Demand Finished Products**

The critical business rule is:

> A Branch Product does not necessarily exist as physical inventory before a sales order.

A factory may produce a semi-finished product, transfer it to a branch, and the branch completes the product by consuming additional components **only when a customer places an order**.

### Example

A factory produces:

```text
Koshary Base
```

The factory transfers Koshary Base to Branch 01.

Branch 01 separately keeps:

```text
Fried Onion
Sauce
Packaging
Other toppings/components
```

When a customer orders:

```text
1 x Koshary
```

the system consumes:

```text
1 x Koshary Base
+
required Fried Onion
+
required Sauce
+
1 x Packaging
```

The system must NOT require 100 completed Koshary units to exist in Branch inventory.

---

# 2. Core Inventory Concept

Use four technical inventory classifications even though the business has three main categories:

| Technical Type | Description |
|---|---|
| RAW_MATERIAL | Purchased materials/components |
| SEMI_FINISHED | Produced by factory and transferred to branches |
| FINISHED | Fully completed stocked products |
| ON_DEMAND_ASSEMBLY | Product assembled/consumed when sold |

The third business category should normally use:

```text
ON_DEMAND_ASSEMBLY
```

instead of maintaining physical stock for the final product.

---

# 3. Inventory Flow

The standard flow is:

```text
SUPPLIER
   |
   v
RAW MATERIAL WAREHOUSE
   |
   v
FACTORY PRODUCTION
   |
   +---- consumes raw materials
   |
   v
SEMI-FINISHED PRODUCT
   |
   v
FACTORY WAREHOUSE
   |
   | Warehouse Transfer
   v
BRANCH WAREHOUSE
   |
   +----------------------+
   |                      |
   v                      v
Semi-Finished         Branch Components
   |                      |
   +----------+-----------+
              |
              v
         SALES ORDER
              |
              v
       BOM / RECIPE ENGINE
              |
              v
        STOCK CHECK
              |
              v
         RESERVATION
              |
              v
        ORDER PREPARATION
              |
              v
     CONSUME COMPONENTS
              |
              v
           SALE
              |
              v
          CUSTOMER
```

---

# 4. Product Master

Create a central `products` table.

Recommended fields:

```text
products
--------
id
sku
barcode
name
description
product_type
uom_id
category_id

is_sellable
is_purchasable
is_producible
is_assembly_product
track_inventory
track_lot
track_expiry

standard_cost
selling_price

active
created_at
updated_at
created_by
updated_by
```

## Product Type

Use:

```text
RAW_MATERIAL
SEMI_FINISHED
FINISHED
ON_DEMAND_ASSEMBLY
```

### Raw Material Example

```text
Rice
product_type = RAW_MATERIAL
is_purchasable = true
is_sellable = false
is_producible = false
```

### Semi-Finished Example

```text
Koshary Base
product_type = SEMI_FINISHED
is_producible = true
is_sellable = false
```

### On-Demand Product Example

```text
Koshary
product_type = ON_DEMAND_ASSEMBLY
is_sellable = true
is_producible = false
is_assembly_product = true
```

---

# 5. Units of Measure

Products must support different units.

Examples:

```text
PCS
KG
GRAM
LITER
ML
BOX
PACK
PORTION
```

Create:

```text
units_of_measure
-----------------
id
code
name
type
conversion_factor
base_unit_id
active
```

Example:

```text
KG
1000 GRAM
```

The system must normalize quantities internally where appropriate.

---

# 6. Warehouse Architecture

A company can have:

```text
Company
|
+-- Factory
|   |
|   +-- Raw Material Warehouse
|   +-- Production/WIP
|   +-- Semi-Finished Warehouse
|
+-- Branch 01
|   |
|   +-- Main Stock
|   +-- Kitchen/Assembly
|   +-- Waste
|
+-- Branch 02
|   |
|   +-- Main Stock
|   +-- Kitchen/Assembly
|   +-- Waste
|
+-- Branch 03
    |
    +-- Main Stock
    +-- Kitchen/Assembly
    +-- Waste
```

Create:

```text
warehouses
----------
id
company_id
branch_id
parent_warehouse_id
name
code
warehouse_type
is_active
```

Warehouse types:

```text
FACTORY
BRANCH
RAW_MATERIAL
SEMI_FINISHED
WIP
KITCHEN
WASTE
TRANSIT
```

---

# 7. Locations

A warehouse can contain multiple logical locations.

Create:

```text
inventory_locations
--------------------
id
warehouse_id
parent_location_id
name
code
location_type
is_active
```

Example:

```text
Branch 01
|
+-- Main Stock
+-- Kitchen
+-- Waste
+-- Damaged
```

This allows accurate movement tracking without creating unnecessary warehouses.

---

# 8. Bill of Materials / Recipe

Use a BOM system.

Tables:

```text
boms
----
id
product_id
name
version
bom_type
status
quantity
uom_id
effective_from
effective_to
created_at
updated_at
```

And:

```text
bom_items
---------
id
bom_id
component_product_id
quantity
uom_id
scrap_percentage
is_optional
sequence
notes
```

BOM types:

```text
FACTORY_PRODUCTION
ON_DEMAND_ASSEMBLY
KIT
```

---

# 9. Multi-Level BOM

The system must support multi-level BOMs.

Example:

```text
Koshary
|
+-- Koshary Base
|   |
|   +-- Rice
|   +-- Lentils
|   +-- Macaroni
|   +-- Sauce Base
|
+-- Fried Onion
+-- Extra Sauce
+-- Packaging
```

The factory BOM:

```text
Koshary Base
----------------
Rice             2 KG
Lentils          1 KG
Macaroni         1 KG
Sauce Base       1 KG
```

The branch/on-demand BOM:

```text
Koshary
----------------
Koshary Base     1 PCS
Fried Onion      50 GR
Sauce            100 ML
Packaging        1 PCS
```

The system must NOT unnecessarily explode the factory BOM when selling Koshary.

The factory already converted raw materials into Koshary Base.

At sale time, consume:

```text
Koshary Base
Fried Onion
Sauce
Packaging
```

---

# 10. Factory Production

Factory production creates semi-finished products.

Example:

```text
Production Order
Product: Koshary Base
Quantity: 100
```

The system calculates:

```text
Rice          200 KG
Lentils       100 KG
Macaroni      100 KG
Sauce Base    100 KG
```

When production is completed:

```text
Raw Material:
Rice          -200
Lentils       -100
Macaroni      -100
Sauce Base    -100

Semi-Finished:
Koshary Base  +100
```

The system must create immutable inventory ledger entries for all movements.

---

# 11. Production Order

Create:

```text
production_orders
-----------------
id
order_number
product_id
planned_quantity
produced_quantity
warehouse_id
source_location_id
destination_location_id
status
planned_date
started_at
completed_at
created_by
completed_by
```

Statuses:

```text
DRAFT
CONFIRMED
IN_PROGRESS
PARTIALLY_COMPLETED
COMPLETED
CANCELLED
```

Production completion must validate component availability before consuming stock.

---

# 12. Factory to Branch Transfer

A transfer changes location ownership/location in inventory but does NOT consume company inventory.

Example:

```text
Factory:
Koshary Base = 100
```

Transfer:

```text
60 Koshary Base
```

After transfer:

```text
Factory = 40
Branch 01 = 60
```

Company total remains:

```text
100
```

Create:

```text
stock_transfers
--------------
id
transfer_number
source_warehouse_id
source_location_id
destination_warehouse_id
destination_location_id
status
requested_by
approved_by
shipped_at
received_at
notes
```

And:

```text
stock_transfer_items
--------------------
id
transfer_id
product_id
quantity
uom_id
lot_id
batch_id
```

---

# 13. Transfer Workflow

Use:

```text
DRAFT
   |
   v
REQUESTED
   |
   v
APPROVED
   |
   v
SHIPPED
   |
   v
RECEIVED
```

Inventory behavior:

### At shipment

```text
Source:
- quantity

Transit:
+ quantity
```

### At receiving

```text
Transit:
- quantity

Destination:
+ quantity
```

If the business does not need transit tracking, a direct transfer can use:

```text
Source - quantity
Destination + quantity
```

But the system should support transit for stronger auditability.

---

# 14. Branch Inventory

Branch inventory may contain:

```text
Semi-Finished
Raw Materials
Branch Components
Packaging
Finished Products
```

Example:

```text
Branch 01
---------------------------
Koshary Base       60
Fried Onion        10 KG
Sauce              10 L
Packaging          100
```

There may be:

```text
Koshary = 0
```

and that is completely valid.

The system can still sell Koshary because it is an on-demand assembly product.

---

# 15. On-Demand Assembly

This is the most important feature.

An `ON_DEMAND_ASSEMBLY` product has:

```text
is_sellable = true
track_inventory = false
is_assembly_product = true
```

Example:

```text
Koshary
```

BOM:

```text
Koshary Base     1
Fried Onion      50 GR
Sauce            100 ML
Packaging        1
```

There should be no requirement for:

```text
Koshary stock = 100
```

Instead, the system derives availability from its components.

---

# 16. Sales Order

Create:

```text
sales_orders
-----------
id
order_number
customer_id
branch_id
warehouse_id
status
order_date
subtotal
discount
tax
total
payment_status
fulfillment_status
created_by
```

And:

```text
sales_order_items
-----------------
id
sales_order_id
product_id
quantity
uom_id
unit_price
discount
tax
total
bom_id
bom_version
fulfillment_status
```

Store the BOM version used by the order.

This is critical.

If the recipe changes later, an old order must still reference the old BOM.

---

# 17. Sales Order Availability

When the customer orders:

```text
5 Koshary
```

the system reads the BOM:

```text
Koshary Base     5
Fried Onion      250 GR
Sauce            500 ML
Packaging        5
```

Then check:

```text
ON HAND
-
RESERVED
=
AVAILABLE
```

For every component.

Example:

```text
Koshary Base
On Hand: 60
Reserved: 10
Available: 50

Fried Onion
On Hand: 10 KG
Reserved: 1 KG
Available: 9 KG

Sauce
On Hand: 10 L
Reserved: 2 L
Available: 8 L

Packaging
On Hand: 100
Reserved: 20
Available: 80
```

The order for 5 Koshary is available.

---

# 18. Inventory Reservation

Reservation does NOT physically reduce inventory.

Example:

```text
Before:

On Hand = 60
Reserved = 10
Available = 50
```

Reserve 5:

```text
On Hand = 60
Reserved = 15
Available = 45
```

The physical stock remains 60.

Create:

```text
inventory_reservations
----------------------
id
sales_order_id
sales_order_item_id
warehouse_id
location_id
product_id
quantity
status
reserved_at
released_at
```

Statuses:

```text
ACTIVE
PARTIALLY_CONSUMED
RELEASED
CONSUMED
CANCELLED
```

---

# 19. Component-Level Reservation

Because the final product does not exist physically, reservation must occur at component level.

Example:

```text
Customer orders:
20 Koshary
```

Reserve:

```text
Koshary Base       20
Fried Onion         1 KG
Sauce               2 L
Packaging          20
```

Do NOT reserve:

```text
Koshary = 20
```

This is the central inventory rule for this business model.

---

# 20. Sales Preparation

Recommended order lifecycle:

```text
DRAFT
   |
   v
CONFIRMED
   |
   v
RESERVED
   |
   v
PREPARING
   |
   v
READY
   |
   v
DELIVERED / COMPLETED
```

At `PREPARING`, the system may consume inventory depending on the business workflow.

Recommended approach:

- Reserve at confirmation.
- Consume at actual preparation/start of fulfillment.
- Release unused reservations if an order is cancelled before consumption.

---

# 21. Sales-Time Consumption

When preparation begins:

```text
Sales Order:
5 Koshary
```

Consume:

```text
Koshary Base      -5
Fried Onion       -250 GR
Sauce             -500 ML
Packaging         -5
```

At this moment:

```text
On Hand decreases.
Reserved decreases.
```

No finished-product stock needs to be created.

---

# 22. Optional Kitchen/Assembly Location

If the business needs preparation tracking, support:

```text
Branch Main Stock
        |
        v
Kitchen / Assembly
        |
        v
Customer
```

However, do not require a physical stock transfer for every preparation if that creates unnecessary complexity.

A simpler implementation can:

```text
Reserve
   |
Prepare
   |
Consume
   |
Complete
```

with Kitchen as a logical workflow rather than a mandatory inventory location.

---

# 23. Inventory Ledger

The inventory ledger must be the source of truth.

Create:

```text
inventory_movements
-------------------
id
transaction_number

product_id
warehouse_id
location_id

transaction_type
reference_type
reference_id

quantity
direction
unit_cost
total_cost

lot_id
batch_id
expiry_date

created_at
created_by
```

Direction:

```text
IN
OUT
```

Transaction types:

```text
PURCHASE_RECEIPT
TRANSFER_OUT
TRANSFER_IN
TRANSIT_IN
TRANSIT_OUT

PRODUCTION_CONSUMPTION
PRODUCTION_OUTPUT

SALES_CONSUMPTION
SALES_RETURN

WASTE
DAMAGE
ADJUSTMENT

STOCK_RETURN
```

Never silently modify historical inventory transactions.

---

# 24. Stock Balance

Create a stock balance/read model:

```text
inventory_balances
------------------
id
product_id
warehouse_id
location_id
on_hand_quantity
reserved_quantity
available_quantity
updated_at
```

Formula:

```text
available_quantity =
on_hand_quantity - reserved_quantity
```

The ledger remains the audit source.

Balances can be recalculated from the ledger if necessary.

---

# 25. Inventory Transactions Must Be Atomic

When consuming an on-demand product, all required components must be handled in one database transaction.

Example:

```text
BEGIN TRANSACTION

1. Validate sales order
2. Validate BOM version
3. Check reservations
4. Check available quantities
5. Create consumption movements
6. Update reservation statuses
7. Update stock balances
8. Mark order preparation as started

COMMIT
```

If one required component fails:

```text
ROLLBACK
```

Do not consume some components and leave others unprocessed.

---

# 26. Negative Inventory

By default:

```text
ALLOW_NEGATIVE_STOCK = false
```

The system must prevent:

```text
Available < required quantity
```

unless an administrator explicitly enables negative stock for a specific warehouse/product.

If negative inventory is enabled, log:

```text
warning
user
timestamp
product
warehouse
reason
```

---

# 27. Wastage

Wastage must be a separate transaction.

Example:

```text
3 Koshary Base damaged
```

Create:

```text
WASTE
```

Movement:

```text
Koshary Base
-3
```

and:

```text
Waste reason:
DAMAGED
```

Possible waste reasons:

```text
DAMAGED
EXPIRED
SPOILED
PRODUCTION_LOSS
PREPARATION_LOSS
CUSTOMER_CANCELLED
OTHER
```

Never directly edit stock quantity to account for waste.

---

# 28. Returns

Support two kinds of returns.

## Customer return

If the product can be returned to stock:

```text
Customer
   |
   v
Return
   |
   v
Branch Stock
```

If it cannot be reused:

```text
Customer
   |
   v
Return
   |
   v
Waste
```

## Factory/Branch transfer return

A branch can return unused semi-finished products:

```text
Branch
   |
   v
Transfer Return
   |
   v
Factory
```

This must create normal inventory movement records.

---

# 29. Cancellation

## Before preparation

Release reservation:

```text
Reserved decreases
Available increases
On Hand unchanged
```

## After preparation

If components were consumed:

```text
Do not simply restore inventory.
```

Instead determine whether:

```text
Product can be returned/reused
```

or:

```text
Product becomes waste
```

Create the appropriate transaction.

---

# 30. Costing

The system should calculate on-demand product cost dynamically.

Example:

```text
Koshary Base      20.00 EGP
Fried Onion        2.00 EGP
Sauce              1.50 EGP
Packaging          2.00 EGP
--------------------------
Total Cost        25.50 EGP
```

Selling price:

```text
45.00 EGP
```

Gross margin:

```text
19.50 EGP
```

Do not hard-code the final product cost if it depends on component costs.

---

# 31. Cost Propagation

Factory production cost:

```text
Raw Material Cost
+
Production Overhead
+
Other Production Cost
=
Semi-Finished Cost
```

Then:

```text
Semi-Finished Cost
+
Branch Components
+
Packaging
=
On-Demand Product Cost
```

If using weighted average costing:

```text
Weighted Average Cost
```

should be recalculated according to inventory receipts/production.

If using FIFO:

```text
FIFO layers
```

must be maintained.

The costing method should be configurable.

---

# 32. BOM Versioning

Every BOM must have versions.

Example:

```text
Koshary BOM v1
Koshary BOM v2
Koshary BOM v3
```

An old sales order must retain:

```text
bom_id
bom_version
```

Changing the recipe must not change historical orders.

---

# 33. Effective Dates

BOM versions should support:

```text
effective_from
effective_to
```

Example:

```text
BOM v1
01-01-2026 → 30-09-2026

BOM v2
01-10-2026 → active
```

New orders use v2.

Old orders remain connected to v1.

---

# 34. Product Availability API

Create an API/service:

```text
GET /inventory/products/{productId}/availability
```

For an on-demand product:

```json
{
  "product_id": 123,
  "product_type": "ON_DEMAND_ASSEMBLY",
  "requested_quantity": 5,
  "available": true,
  "components": [
    {
      "product_id": 10,
      "required": 5,
      "available": 20,
      "sufficient": true
    },
    {
      "product_id": 11,
      "required": 0.25,
      "available": 4,
      "sufficient": true
    }
  ]
}
```

---

# 35. Required Services

Separate business logic into services.

Recommended:

```text
InventoryService
WarehouseService
TransferService
ProductionService
BomService
ReservationService
AssemblyService
SalesOrderService
CostingService
WasteService
ReturnService
StockAvailabilityService
```

---

# 36. InventoryService

Responsibilities:

```text
receiveStock()
issueStock()
adjustStock()
consumeStock()
returnStock()
getStockBalance()
getAvailableStock()
```

It must never allow uncontrolled direct stock manipulation.

---

# 37. TransferService

Responsibilities:

```text
createTransfer()
approveTransfer()
shipTransfer()
receiveTransfer()
cancelTransfer()
```

Validate:

```text
source availability
permissions
quantity
warehouse status
product status
```

---

# 38. ProductionService

Responsibilities:

```text
createProductionOrder()
confirmProduction()
startProduction()
completeProduction()
cancelProduction()
```

When production completes:

```text
consume BOM components
create output product
calculate production cost
create ledger movements
```

---

# 39. ReservationService

Responsibilities:

```text
checkAvailability()
reserveComponents()
releaseReservation()
consumeReservation()
partiallyReleaseReservation()
```

Reservation must operate against components for on-demand products.

---

# 40. AssemblyService

Responsibilities:

```text
resolveBOM()
calculateRequiredComponents()
validateComponents()
reserveComponents()
consumeComponents()
calculateAssemblyCost()
```

Do not create physical final-product stock unless the product configuration specifically requires it.

---

# 41. Sales Order Integration

When adding an on-demand product to a sales order:

```text
1. Identify product
2. Identify active BOM
3. Calculate required components
4. Check branch inventory
5. Calculate availability
6. Show availability status
7. Confirm order
8. Reserve components
```

When preparation starts:

```text
1. Validate reservation
2. Consume components
3. Create inventory movements
4. Update reservation
5. Update order fulfillment
```

---

# 42. Multiple Branches

Every branch must have independent inventory.

Example:

```text
Koshary Base

Branch 01 = 50
Branch 02 = 20
Branch 03 = 100
```

An order in Branch 01 must never consume Branch 02 stock.

Availability must always use:

```text
sales_order.branch_id
+
sales_order.warehouse_id
```

---

# 43. Inter-Branch Transfer

Support:

```text
Branch 01
   |
   v
Transit
   |
   v
Branch 02
```

Example:

```text
20 Koshary Base
```

Branch 01:

```text
-20
```

Transit:

```text
+20
```

Branch 02:

```text
+20
```

---

# 44. Permissions

Recommended permissions:

```text
inventory.view
inventory.adjust
inventory.transfer.create
inventory.transfer.approve
inventory.transfer.receive

production.view
production.create
production.approve
production.complete

bom.view
bom.create
bom.edit
bom.approve

sales.order.create
sales.order.confirm
sales.order.prepare
sales.order.cancel

inventory.waste.create
inventory.waste.approve
```

Critical inventory operations should be audited.

---

# 45. Audit Log

Create:

```text
audit_logs
----------
id
user_id
action
entity_type
entity_id
old_values
new_values
ip_address
created_at
```

Log:

```text
Stock adjustments
Production completion
Transfer approval
Transfer receipt
BOM changes
Reservation changes
Sales consumption
Waste
Returns
```

---

# 46. Database Relationships

Core relationship:

```text
products
   |
   +---- bom
   |      |
   |      +---- bom_items
   |
   +---- inventory_movements
   |
   +---- inventory_balances
   |
   +---- inventory_reservations
   |
   +---- sales_order_items
   |
   +---- production_order_items
   |
   +---- stock_transfer_items
```

Warehouse:

```text
warehouses
   |
   +---- inventory_locations
   |
   +---- inventory_balances
   |
   +---- inventory_movements
   |
   +---- stock_transfers
```

---

# 47. Important Database Rules

Use foreign keys.

Use numeric/decimal types for quantities.

Do NOT use floating point for financial values.

Recommended:

```text
quantity      DECIMAL
unit_cost     DECIMAL
total_cost    DECIMAL
unit_price    DECIMAL
tax           DECIMAL
```

Financial values should use suitable precision for EGP and the supported currencies.

---

# 48. Concurrency Protection

This is essential.

Two customers may order the same limited inventory simultaneously.

Example:

```text
Koshary Base = 5
```

Order A:

```text
5 Koshary
```

Order B:

```text
3 Koshary
```

Both must not successfully reserve the same 5 units.

Use:

```text
database transaction
row-level locking
atomic reservation
```

The reservation operation must be concurrency-safe.

---

# 49. Idempotency

Inventory operations must be idempotent.

If a request is submitted twice:

```text
consumeSalesOrder(order_id)
```

the system must not consume the stock twice.

Use a unique transaction/reference key:

```text
reference_type
reference_id
transaction_type
```

or an explicit idempotency key.

---

# 50. Inventory Reconciliation

Provide an inventory reconciliation feature.

Example:

```text
System Quantity = 100
Physical Quantity = 97
Difference = -3
```

The user creates:

```text
Stock Adjustment
Reason: Physical Count
Quantity: -3
```

The system creates a ledger transaction.

Never silently overwrite the system quantity.

---

# 51. Reports

Create at least these reports:

## Stock On Hand

```text
Product
Warehouse
Location
On Hand
Reserved
Available
```

## Stock Movement

```text
Date
Product
Transaction
Reference
Warehouse
IN
OUT
Balance
User
```

## Warehouse Transfer Report

```text
Transfer Number
From
To
Product
Quantity
Status
Date
```

## Production Report

```text
Production Order
Product
Planned
Produced
Consumed
Cost
Date
```

## Consumption Report

```text
Sales Order
Product
Component
Quantity Consumed
Cost
Branch
```

## Waste Report

```text
Product
Quantity
Branch
Reason
Cost
Date
User
```

## On-Demand Product Cost

```text
Final Product
Component
Quantity
Unit Cost
Total Cost
```

---

# 52. Dashboard KPIs

Inventory dashboard:

```text
Total Stock Value
Low Stock Items
Reserved Stock
Available Stock
Pending Transfers
Pending Production
Today's Consumption
Today's Waste
```

Branch dashboard:

```text
Branch Stock Value
Products Available
Low Stock
Pending Sales Orders
Orders Preparing
Today's Sales
Today's Consumption
Waste Cost
```

---

# 53. Low Stock

For every product define:

```text
minimum_stock
reorder_point
maximum_stock
```

For on-demand products, calculate availability from components.

Example:

```text
Koshary Base:
Available = 20

Fried Onion:
Available = 500g

Sauce:
Available = 2L

Packaging:
Available = 50
```

The system should determine how many Koshary units can actually be prepared.

---

# 54. Maximum Buildable Quantity

This is an important feature.

If:

```text
Koshary Base = 50
Fried Onion = enough for 100
Sauce = enough for 80
Packaging = 200
```

then:

```text
Maximum Buildable Koshary = 50
```

Formula:

```text
floor(
available_component_quantity
/
required_component_quantity
)
```

for each component.

The final availability is the minimum result.

Example:

```text
Koshary Base → 50
Fried Onion  → 100
Sauce        → 80
Packaging    → 200

Maximum Buildable = 50
```

This should be displayed to the sales interface.

---

# 55. Optional Components

BOM items may be:

```text
REQUIRED
OPTIONAL
```

Example:

```text
Koshary
Required:
Koshary Base
Sauce
Packaging

Optional:
Extra Onion
Extra Sauce
Cheese
Spicy Sauce
```

Optional components must be added to the sales order as modifiers/options.

The system should calculate their additional quantity and price.

---

# 56. Sales Modifiers

For example:

```text
Koshary
+
Extra Onion
+
Extra Sauce
```

The order should store the selected modifiers.

Example:

```text
sales_order_item_modifiers
--------------------------
id
sales_order_item_id
modifier_product_id
quantity
unit_price
```

The selected modifier's components are added to consumption.

---

# 57. Example With Modifiers

Customer orders:

```text
1 Koshary
Extra Onion
Extra Sauce
```

Normal BOM:

```text
Koshary Base     1
Onion            50g
Sauce            100ml
Packaging        1
```

Modifier:

```text
Extra Onion      +30g
Extra Sauce      +50ml
```

Final consumption:

```text
Koshary Base     1
Onion            80g
Sauce            150ml
Packaging        1
```

---

# 58. What NOT To Do

Do NOT:

```text
1. Create 100 finished Koshary units when only Koshary Base exists.
2. Reduce stock by directly editing stock_quantity.
3. Treat warehouse transfers as consumption.
4. Reserve final products when the final product is not physically stocked.
5. Recalculate historical orders using the latest BOM.
6. Allow simultaneous reservations to oversell stock.
7. Ignore wastage.
8. Mix branch inventories.
9. Change historical inventory movements.
10. Consume stock before validating the complete BOM.
```

---

# 59. Recommended Business Rules

Implement these rules:

```text
RULE 1:
Raw materials are normally purchased.

RULE 2:
Semi-finished products are normally created by production.

RULE 3:
Finished products may be stocked normally.

RULE 4:
On-demand assembly products do not require physical finished stock.

RULE 5:
On-demand availability is calculated from BOM components.

RULE 6:
Reservations occur against components.

RULE 7:
Consumption occurs when preparation/fulfillment starts.

RULE 8:
Warehouse transfers do not change total company quantity.

RULE 9:
Every physical stock change creates a ledger movement.

RULE 10:
Inventory ledger is immutable.

RULE 11:
BOM versions are immutable once used by transactions.

RULE 12:
All inventory operations are atomic.

RULE 13:
All critical operations are audited.

RULE 14:
Negative inventory is disabled by default.

RULE 15:
Historical orders retain their original BOM version.
```

---

# 60. Example End-to-End Scenario

## Step 1 — Purchase

Factory purchases:

```text
Rice 500 KG
Lentils 200 KG
Macaroni 200 KG
```

Receive into:

```text
Factory Raw Material Warehouse
```

---

## Step 2 — Production

Produce:

```text
100 Koshary Base
```

Consume:

```text
Rice
Lentils
Macaroni
Sauce Base
```

Create:

```text
Koshary Base +100
```

---

## Step 3 — Transfer

Transfer:

```text
60 Koshary Base
```

from:

```text
Factory
```

to:

```text
Branch 01
```

---

## Step 4 — Branch Stock

Branch has:

```text
Koshary Base       60
Fried Onion        10 KG
Sauce               10 L
Packaging          100
```

---

## Step 5 — Customer Order

Customer orders:

```text
5 Koshary
```

---

## Step 6 — Calculate Components

System calculates:

```text
Koshary Base       5
Fried Onion        250 GR
Sauce              500 ML
Packaging          5
```

---

## Step 7 — Reserve

System reserves:

```text
Koshary Base       5
Fried Onion        250 GR
Sauce              500 ML
Packaging          5
```

---

## Step 8 — Prepare

Branch starts preparation.

System consumes:

```text
Koshary Base       -5
Fried Onion        -250 GR
Sauce              -500 ML
Packaging          -5
```

---

## Step 9 — Complete Sale

Order becomes:

```text
COMPLETED
```

There is still no requirement for:

```text
Koshary stock
```

The final product existed only as an order/assembly result.

---

# 61. Suggested UI

## Product Screen

Tabs:

```text
Basic Information
Inventory
BOM / Recipe
Pricing
Suppliers
Branches
History
```

---

## BOM Screen

Display:

```text
Product: Koshary

BOM Version: 2

Components:

Koshary Base      1 PCS
Fried Onion       50 GR
Sauce             100 ML
Packaging         1 PCS
```

Show:

```text
Estimated Cost
Maximum Buildable Quantity
Available Components
Missing Components
```

---

# 62. Sales Screen

When the salesperson selects:

```text
Koshary
Quantity: 5
```

show:

```text
Available to prepare: 50
```

Then:

```text
Components Required:

Koshary Base       5
Fried Onion        250g
Sauce              500ml
Packaging          5
```

Status:

```text
AVAILABLE
```

If insufficient:

```text
NOT AVAILABLE
```

Show the missing component:

```text
Sauce
Required: 500 ML
Available: 300 ML
Shortage: 200 ML
```

---

# 63. Inventory Screen

For an on-demand product:

```text
Koshary

Physical Stock:
Not Stocked

Maximum Buildable:
50

Based On:

Koshary Base       60
Fried Onion        10 KG
Sauce               5 L
Packaging          100
```

This is much more meaningful than showing:

```text
Koshary Stock = 0
```

which could incorrectly imply that the product cannot be sold.

---

# 64. Technical API Examples

## Availability

```http
GET /api/inventory/availability/product/{productId}?warehouseId=10&quantity=5
```

## Reserve

```http
POST /api/inventory/reservations
```

## Consume

```http
POST /api/inventory/assembly/consume
```

## Transfer

```http
POST /api/inventory/transfers
```

## Receive Transfer

```http
POST /api/inventory/transfers/{id}/receive
```

## Production

```http
POST /api/production/orders
```

## Complete Production

```http
POST /api/production/orders/{id}/complete
```

---

# 65. Validation Checklist

Before implementing, verify:

```text
[ ] Product types implemented
[ ] UOM implemented
[ ] Warehouses implemented
[ ] Locations implemented
[ ] BOM implemented
[ ] BOM versioning implemented
[ ] Multi-level BOM supported
[ ] Production implemented
[ ] Transfer implemented
[ ] Transit supported
[ ] Branch inventory isolated
[ ] Reservations implemented
[ ] Component-level reservation implemented
[ ] On-demand availability implemented
[ ] Maximum buildable quantity implemented
[ ] Sales-time consumption implemented
[ ] Waste implemented
[ ] Returns implemented
[ ] Costing implemented
[ ] Inventory ledger implemented
[ ] Stock balance implemented
[ ] Concurrency protection implemented
[ ] Idempotency implemented
[ ] Audit logs implemented
[ ] Low-stock alerts implemented
[ ] Inventory reports implemented
[ ] Historical BOM version preserved
```

---

# 66. Antigravity Implementation Instructions

Build the system according to the specification above.

## Priority

Implement in this order:

### Phase 1 — Foundation

```text
Products
Units
Categories
Warehouses
Locations
Inventory Ledger
Inventory Balances
```

### Phase 2 — Production

```text
BOM
BOM Items
BOM Versions
Production Orders
Production Consumption
Production Output
```

### Phase 3 — Transfers

```text
Transfer Requests
Approval
Shipment
Transit
Receipt
Inter-branch Transfers
```

### Phase 4 — Sales-Time Assembly

```text
On-Demand Product
BOM Resolution
Component Availability
Maximum Buildable Quantity
Component Reservation
Sales-Time Consumption
```

### Phase 5 — Inventory Controls

```text
Waste
Damage
Returns
Adjustments
Reconciliation
Audit Logs
```

### Phase 6 — Costing and Reports

```text
Product Cost
BOM Cost
Production Cost
Sales Cost
Waste Cost
Stock Reports
Movement Reports
Branch Reports
```

---

# 67. Critical Acceptance Tests

Antigravity must test at least these scenarios.

## Test 1 — Factory Production

Given:

```text
Raw materials available
```

When:

```text
100 Koshary Base are produced
```

Then:

```text
Raw materials decrease
Koshary Base increases by 100
```

---

## Test 2 — Warehouse Transfer

Given:

```text
Factory Koshary Base = 100
```

When:

```text
60 transferred to Branch 01
```

Then:

```text
Factory = 40
Branch = 60
Company total = 100
```

---

## Test 3 — On-Demand Sale

Given:

```text
Branch Koshary Base = 60
Fried Onion = 10 KG
Sauce = 10 L
Packaging = 100
```

When:

```text
Customer orders 5 Koshary
```

Then:

```text
5 Koshary is available
Components are reserved
```

After preparation:

```text
Koshary Base = 55
Fried Onion = 9.75 KG
Sauce = 9.5 L
Packaging = 95
```

No finished Koshary inventory is required.

---

## Test 4 — Insufficient Component

Given:

```text
Koshary Base = 60
Sauce = 300 ML
```

Order:

```text
5 Koshary
```

Required:

```text
500 ML Sauce
```

The system must reject or place the order into the configured shortage workflow.

It must NOT create negative inventory.

---

## Test 5 — Concurrent Orders

Given:

```text
Koshary Base = 5
```

Order A:

```text
5 Koshary
```

Order B:

```text
3 Koshary
```

Only one reservation combination may succeed.

The system must prevent double reservation.

---

## Test 6 — Cancellation

Given:

```text
Reserved = 5
On Hand = 20
```

Cancel order before preparation.

Then:

```text
On Hand = 20
Reserved = 0
Available = 20
```

---

## Test 7 — Waste

Given:

```text
Koshary Base = 20
```

Record:

```text
Waste = 2
Reason = Damaged
```

Then:

```text
Koshary Base = 18
```

and a waste ledger record exists.

---

## Test 8 — BOM Version

Order uses:

```text
BOM v1
```

Then change product recipe to:

```text
BOM v2
```

Historical order must still reference:

```text
BOM v1
```

---

# 68. Final Architecture Principle

The most important implementation rule is:

```text
PHYSICAL INVENTORY
        |
        +--> Raw Materials
        |
        +--> Semi-Finished Products
        |
        +--> Finished Products
        |
        +--> Branch Components

ON-DEMAND PRODUCTS
        |
        +--> Do not require physical stock
        |
        +--> Availability calculated from BOM
        |
        +--> Components reserved
        |
        +--> Components consumed when prepared/sold
```

Therefore:

```text
Factory creates Semi-Finished Product
             ↓
Warehouse Transfer
             ↓
Branch receives Semi-Finished Product
             ↓
Customer orders Final Product
             ↓
System resolves BOM
             ↓
System checks component availability
             ↓
System reserves components
             ↓
Branch prepares product
             ↓
System consumes components
             ↓
Sale completed
```

This architecture accurately represents a business where the final sellable product is created **only when the sales order requires it**, while maintaining proper inventory control, warehouse transfers, reservations, costing, production, waste, and auditability.
