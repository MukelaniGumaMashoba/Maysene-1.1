# Component System Guide

This project uses a layered component system:

- Shared UI primitives live in `src/components/ui/`.
- Page shells and navigation live in `src/components/layout/` and `src/components/shared/`.
- Feature flows live in folders like `forms/`, `map/`, `dashboard/`, `accounts/`, `inv/`, `workshop/`, and `ui-personal/`.

Use the smallest component that already solves the problem. If you are building a new screen, start with the shared layout and primitives first, then add feature-specific pieces only where needed.

## General Usage Rules

- Most files in `src/components/` are React client components, so they should be rendered from client-aware routes or other client components.
- Import components from their file path, for example `@/components/ui/button` or `@/components/map/driver-location-map`.
- Prefer composing existing feature components instead of duplicating page logic in new screens.
- Map-based components depend on Mapbox and usually require `NEXT_PUBLIC_MAPBOX_TOKEN`.
- Many screens rely on context providers in `src/context/`, so check those dependencies before reusing a component in isolation.

## Shared Shell Components

### `src/components/shared/`

- [src/components/shared/AppLayout.tsx](src/components/shared/AppLayout.tsx) - Full app shell with responsive sidebar, top bar, auth greeting, and navigation. Use this for apps that need a branded dashboard layout.
- [src/components/shared/DashboardHeader.tsx](src/components/shared/DashboardHeader.tsx) - Header block for dashboard pages with title, subtitle, and header actions.
- [src/components/shared/DashboardTabs.tsx](src/components/shared/DashboardTabs.tsx) - Tab switcher for dashboard content sections.
- [src/components/shared/StatsCard.tsx](src/components/shared/StatsCard.tsx) - Small metric card for counts and summary indicators.

### `src/components/layout/`

- [src/components/layout/page-container.tsx](src/components/layout/page-container.tsx) - Route-aware page shell that reads global context, renders page title, action buttons, stats, tabs, and data tables.
- [src/components/layout/page-title.jsx](src/components/layout/page-title.jsx) - Dynamic page title area used by the protected route shell.
- [src/components/layout/sidebar.jsx](src/components/layout/sidebar.jsx) - Main sidebar navigation for app routes.
- [src/components/layout/header.jsx](src/components/layout/header.jsx) - Top header for page sections.
- [src/components/layout/detail-action-bar.jsx](src/components/layout/detail-action-bar.jsx) - Action bar for detail pages such as edit, delete, print, or workflow actions.
- [src/components/layout/dialog-screen.jsx](src/components/layout/dialog-screen.jsx) - Full-screen dialog wrapper for modal-like detail flows.
- [src/components/layout/alert-screen.jsx](src/components/layout/alert-screen.jsx) - Alert and status screen wrapper for warnings, empty states, and access issues.

## Shared Utility Components

- [src/components/logout-button.tsx](src/components/logout-button.tsx) - Sign-out action tied to the auth flow.
- [src/components/theme-provider.tsx](src/components/theme-provider.tsx) - Theme context wrapper for dark/light or other color modes.
- [src/components/toast.tsx](src/components/toast.tsx) - App-level toast presenter.
- [src/components/use-toast.ts](src/components/use-toast.ts) - Toast hook helper for triggering notifications.
- [src/components/userAvatar.tsx](src/components/userAvatar.tsx) - User avatar display for headers, menus, and profile surfaces.
- [src/components/error-boundary.tsx](src/components/error-boundary.tsx) - React error boundary for fallback UI when a subtree crashes.
- [src/components/blocker.tsx](src/components/blocker.tsx) - Blocking overlay or guard component used for access or workflow control.
- [src/components/navigationBtn.tsx](src/components/navigationBtn.tsx) - Navigation button helper for moving between screens.
- [src/components/updatePwrd.tsx](src/components/updatePwrd.tsx) - Password update flow component.
- [src/components/autocomplete.jsx](src/components/autocomplete.jsx) - Generic autocomplete input.
- [src/components/PartsForm.tsx](src/components/PartsForm.tsx) - Parts entry form for workshop or inventory workflows.
- [src/components/RequestedParts.tsx](src/components/RequestedParts.tsx) - Requested parts list or request summary.
- [src/components/RepairHistory.tsx](src/components/RepairHistory.tsx) - Repair history display for a vehicle, job, or asset.
- [src/components/FuelCanBusDisplay.tsx](src/components/FuelCanBusDisplay.tsx) - Fuel / CAN bus telemetry display.
- [src/components/TripRouteMap.tsx](src/components/TripRouteMap.tsx) - Route map wrapper for trip visualization.
- [src/components/add-drivers-form.tsx](src/components/add-drivers-form.tsx) - Driver creation helper used when assigning or onboarding drivers.

## UI Primitives

The `src/components/ui/` folder contains reusable building blocks. They are designed to be composed rather than used as standalone pages.

### Inputs and form controls

- [src/components/ui/button.tsx](src/components/ui/button.tsx) - Primary action button.
- [src/components/ui/input.tsx](src/components/ui/input.tsx) - Text input field.
- [src/components/ui/textarea.tsx](src/components/ui/textarea.tsx) - Multi-line text input.
- [src/components/ui/label.tsx](src/components/ui/label.tsx) - Form label.
- [src/components/ui/select.tsx](src/components/ui/select.tsx) - Select dropdown control.
- [src/components/ui/radio-group.tsx](src/components/ui/radio-group.tsx) - Radio selection group.
- [src/components/ui/checkbox.tsx](src/components/ui/checkbox.tsx) - Boolean checkbox control.
- [src/components/ui/switch.tsx](src/components/ui/switch.tsx) - Toggle switch control.
- [src/components/ui/calendar.tsx](src/components/ui/calendar.tsx) - Date picker calendar.
- [src/components/ui/datetime-picker.tsx](src/components/ui/datetime-picker.tsx) - Combined date and time picker.
- [src/components/ui/time-picker.tsx](src/components/ui/time-picker.tsx) - Time picker control.
- [src/components/ui/form.tsx](src/components/ui/form.tsx) - Form state and validation wrapper.
- [src/components/ui/dynamic-input.tsx](src/components/ui/dynamic-input.tsx) - Repeating or schema-driven input builder.

### Containers and navigation

- [src/components/ui/card.tsx](src/components/ui/card.tsx) - Standard content card.
- [src/components/ui/dialog.tsx](src/components/ui/dialog.tsx) - Modal dialog container.
- [src/components/ui/sheet.tsx](src/components/ui/sheet.tsx) - Slide-in sheet container.
- [src/components/ui/popover.tsx](src/components/ui/popover.tsx) - Floating popover container.
- [src/components/ui/dropdown-menu.tsx](src/components/ui/dropdown-menu.tsx) - Menu with actions and nested options.
- [src/components/ui/navigation-menu.tsx](src/components/ui/navigation-menu.tsx) - Navigation menu primitives.
- [src/components/ui/sidebar.tsx](src/components/ui/sidebar.tsx) - Sidebar primitive for side navigation layouts.
- [src/components/ui/collapsible.tsx](src/components/ui/collapsible.tsx) - Expand/collapse container.
- [src/components/ui/accordion.tsx](src/components/ui/accordion.tsx) - Accordion sections for stacked content.
- [src/components/ui/tabs.tsx](src/components/ui/tabs.tsx) - Tabbed content container.
- [src/components/ui/scroll-area.tsx](src/components/ui/scroll-area.tsx) - Scrollable container with styled scrollbars.
- [src/components/ui/separator.tsx](src/components/ui/separator.tsx) - Visual divider.
- [src/components/ui/table.tsx](src/components/ui/table.tsx) - Table primitive.

### Feedback and status

- [src/components/ui/alert.tsx](src/components/ui/alert.tsx) - Inline alert message.
- [src/components/ui/alert-dialog.tsx](src/components/ui/alert-dialog.tsx) - Confirmation or destructive action dialog.
- [src/components/ui/badge.tsx](src/components/ui/badge.tsx) - Small status badge or tag.
- [src/components/ui/progress.tsx](src/components/ui/progress.tsx) - Linear progress indicator.
- [src/components/ui/skeleton.tsx](src/components/ui/skeleton.tsx) - Loading placeholder.
- [src/components/ui/loader.jsx](src/components/ui/loader.jsx) - Loading spinner or page loader.
- [src/components/ui/toast.jsx](src/components/ui/toast.jsx) - Toast UI primitive.
- [src/components/ui/sonner.tsx](src/components/ui/sonner.tsx) - Sonner toast provider or wrapper.
- [src/components/ui/tooltip.tsx](src/components/ui/tooltip.tsx) - Hover tooltip wrapper.
- [src/components/ui/avatar.tsx](src/components/ui/avatar.tsx) - Avatar display primitive.
- [src/components/ui/count-up.jsx](src/components/ui/count-up.jsx) - Animated numeric counter for dashboard values.
- [src/components/ui/sliding-number.tsx](src/components/ui/sliding-number.tsx) - Animated number transition component.

### Data and display helpers

- [src/components/ui/data-table.jsx](src/components/ui/data-table.jsx) - Generic data table with filtering and export support.
- [src/components/ui/detail-card.jsx](src/components/ui/detail-card.jsx) - Compact detail panel for key-value records.
- [src/components/ui/chart.tsx](src/components/ui/chart.tsx) - Shared chart wrapper and chart styling utilities.
- [src/components/ui/fuel-gauge.tsx](src/components/ui/fuel-gauge.tsx) - Gauge for fuel level or telemetry status.
- [src/components/ui/side-by-side-cards.jsx](src/components/ui/side-by-side-cards.jsx) - Paired card layout for comparisons.
- [src/components/ui/unauthorized-stop-alert.tsx](src/components/ui/unauthorized-stop-alert.tsx) - Alert for invalid or blocked stop actions.

### Route and logistics components

- [src/components/ui/address-autocomplete.jsx](src/components/ui/address-autocomplete.jsx) - Address search and selection input.
- [src/components/ui/location-autocomplete.jsx](src/components/ui/location-autocomplete.jsx) - General location autocomplete field.
- [src/components/ui/client-dropdown.jsx](src/components/ui/client-dropdown.jsx) - Client picker dropdown.
- [src/components/ui/client-location-dropdown.jsx](src/components/ui/client-location-dropdown.jsx) - Dropdown for selecting a client location.
- [src/components/ui/client-loading-dropdown.jsx](src/components/ui/client-loading-dropdown.jsx) - Loading-location selector for clients.
- [src/components/ui/client-loading-location-modal.jsx](src/components/ui/client-loading-location-modal.jsx) - Modal for creating or editing client loading locations.
- [src/components/ui/client-address-popup.jsx](src/components/ui/client-address-popup.jsx) - Popup for displaying client address details.
- [src/components/ui/driver-dropdown.jsx](src/components/ui/driver-dropdown.jsx) - Driver picker dropdown.
- [src/components/ui/commodity-dropdown.jsx](src/components/ui/commodity-dropdown.jsx) - Commodity selector for load or cargo records.
- [src/components/ui/stop-point-dropdown.jsx](src/components/ui/stop-point-dropdown.jsx) - Stop point selector dropdown.
- [src/components/ui/route-preview-map.tsx](src/components/ui/route-preview-map.tsx) - Route preview map that uses stored coordinates and optionally renders driver, stop point, and geofence markers.
- [src/components/ui/route-optimizer.tsx](src/components/ui/route-optimizer.tsx) - Route optimization card that calls the route API and displays distance, duration, ETA, warnings, and restrictions.
- [src/components/ui/route-tracker.tsx](src/components/ui/route-tracker.tsx) - Route tracking component for live or in-progress movement.
- [src/components/ui/route-confirmation-modal.tsx](src/components/ui/route-confirmation-modal.tsx) - Confirmation dialog for route-related actions.
- [src/components/ui/progress-with-waypoints.jsx](src/components/ui/progress-with-waypoints.jsx) - Progress bar or tracker that includes waypoint milestones.

### Modals and overlays

- [src/components/ui/morphing-dialog.tsx](src/components/ui/morphing-dialog.tsx) - Animated dialog shell.

## Forms

The forms folder contains standalone record forms plus the multi-step trip form.

- [src/components/forms/signin-form.jsx](src/components/forms/signin-form.jsx) - Login form.
- [src/components/forms/user-form.jsx](src/components/forms/user-form.jsx) - User create/edit form.
- [src/components/forms/driver-form.jsx](src/components/forms/driver-form.jsx) - Driver create/edit form.
- [src/components/forms/vehicle-form.jsx](src/components/forms/vehicle-form.jsx) - Vehicle create/edit form.
- [src/components/forms/client-form.jsx](src/components/forms/client-form.jsx) - Client create/edit form.
- [src/components/forms/cost-centre-form.jsx](src/components/forms/cost-centre-form.jsx) - Cost centre create/edit form.
- [src/components/forms/stop-point-form.jsx](src/components/forms/stop-point-form.jsx) - Stop point create/edit form.
- [src/components/forms/subcontractor-form.tsx](src/components/forms/subcontractor-form.tsx) - Subcontractor onboarding or editing form.
- [src/components/forms/trip-form.jsx](src/components/forms/trip-form.jsx) - Multi-step trip form. It loads reference data from Supabase, supports create/edit modes, and composes the section files under `src/components/forms/trip-form/`.

### Trip form sections

- [src/components/forms/trip-form/basic-info-section.jsx](src/components/forms/trip-form/basic-info-section.jsx) - Core trip metadata such as dates, references, and basic trip fields.
- [src/components/forms/trip-form/client-section.jsx](src/components/forms/trip-form/client-section.jsx) - Client selection and client-specific trip data.
- [src/components/forms/trip-form/drivers-vehicles-section.jsx](src/components/forms/trip-form/drivers-vehicles-section.jsx) - Driver, vehicle, and trailer assignment section.
- [src/components/forms/trip-form/locations-section.jsx](src/components/forms/trip-form/locations-section.jsx) - Pickup and drop-off location editor.
- [src/components/forms/trip-form/waypoints-section.jsx](src/components/forms/trip-form/waypoints-section.jsx) - Waypoint entry and sequencing section.
- [src/components/forms/trip-form/stop-points-section.jsx](src/components/forms/trip-form/stop-points-section.jsx) - Stop point assignment section.
- [src/components/forms/trip-form/expenses-section.jsx](src/components/forms/trip-form/expenses-section.jsx) - Trip expense capture section.
- [src/components/forms/trip-form/create-stop-point-modal.jsx](src/components/forms/trip-form/create-stop-point-modal.jsx) - Modal for creating a new stop point during trip entry.

## Maps and Routing

These components are the main route, tracking, and map visualization building blocks.

- [src/components/map/driver-location-map.tsx](src/components/map/driver-location-map.tsx) - Mapbox map showing current driver location and an optional route line through waypoints.
- [src/components/map/trip-map-view.jsx](src/components/map/trip-map-view.jsx) - Trip map presentation component.
- [src/components/map/trip-mapbox-view.jsx](src/components/map/trip-mapbox-view.jsx) - Mapbox-backed trip map view.
- [src/components/map/trip-view.jsx](src/components/map/trip-view.jsx) - Trip visualization wrapper.
- [src/components/map/display-map.jsx](src/components/map/display-map.jsx) - General map display component.
- [src/components/map/advanceMap.tsx](src/components/map/advanceMap.tsx) - Advanced map display for richer route scenarios.
- [src/components/map/techMap.tsx](src/components/map/techMap.tsx) - Technical map view for diagnostics or fleet operations.
- [src/components/map/MapDirections.tsx](src/components/map/MapDirections.tsx) - Directions or turn-by-turn route helper.

### Map usage notes

- Use `driver-location-map` when you already have driver coordinates and want to render route geometry immediately.
- Use `route-preview-map` when the data source may be a string, object, or mixed location payload that needs normalization before plotting.
- Use `route-optimizer` when you need to request a server-side optimization result and display the returned distance, ETA, and restrictions.

## Dashboards, Charts, and KPI Views

- [src/components/dashboard/ExecutiveDashboard.tsx](src/components/dashboard/ExecutiveDashboard.tsx) - Main executive dashboard view.
- [src/components/dashboard/ExecutiveDashboardEPS.tsx](src/components/dashboard/ExecutiveDashboardEPS.tsx) - EPS-specific executive dashboard variant.
- [src/components/dashboard/DriverPerformanceDashboard.tsx](src/components/dashboard/DriverPerformanceDashboard.tsx) - Driver performance dashboard.
- [src/components/dashboard/driverHistory.tsx](src/components/dashboard/driverHistory.tsx) - Driver history panel.
- [src/components/dashboard/vehicleHistory.tsx](src/components/dashboard/vehicleHistory.tsx) - Vehicle history panel.
- [src/components/dashboard/trips.tsx](src/components/dashboard/trips.tsx) - Trip metrics and trip activity view.
- [src/components/dashboard/recentActivities.tsx](src/components/dashboard/recentActivities.tsx) - Recent activity feed.
- [src/components/dashboard/types.tsx](src/components/dashboard/types.tsx) - Shared dashboard type definitions.
- [src/components/charts/DriverPerformanceChart.tsx](src/components/charts/DriverPerformanceChart.tsx) - Driver performance chart.
- [src/components/charts/FleetSummaryChart.tsx](src/components/charts/FleetSummaryChart.tsx) - Fleet summary chart.
- [src/components/charts/FuelSummaryChart.tsx](src/components/charts/FuelSummaryChart.tsx) - Fuel usage and summary chart.
- [src/components/charts/ViolationsChart.tsx](src/components/charts/ViolationsChart.tsx) - Violations chart.
- [src/components/jobs/jobsStat.tsx](src/components/jobs/jobsStat.tsx) - Job statistics summary.
- [src/components/financials/FinancialsPanel.tsx](src/components/financials/FinancialsPanel.tsx) - Financial dashboard panel.

## Detail Pages

Detail pages are usually mounted from data tables, cards, or route-specific screens.

- [src/components/detail-pages/client-details.jsx](src/components/detail-pages/client-details.jsx) - Client detail screen.
- [src/components/detail-pages/cost-centre-screen.jsx](src/components/detail-pages/cost-centre-screen.jsx) - Cost centre detail screen.
- [src/components/detail-pages/driver-details.jsx](src/components/detail-pages/driver-details.jsx) - Driver detail screen.
- [src/components/detail-pages/stop-point-details.jsx](src/components/detail-pages/stop-point-details.jsx) - Stop point detail screen.
- [src/components/detail-pages/trip-details.jsx](src/components/detail-pages/trip-details.jsx) - Trip detail screen.
- [src/components/detail-pages/user-details.jsx](src/components/detail-pages/user-details.jsx) - User detail screen.
- [src/components/detail-pages/vehicle-details.jsx](src/components/detail-pages/vehicle-details.jsx) - Vehicle detail screen.

## Tables

- [src/components/tables/subcontractors-table.tsx](src/components/tables/subcontractors-table.tsx) - Subcontractors table view.

## Modals

- [src/components/modals/modal.tsx](src/components/modals/modal.tsx) - Base modal wrapper.
- [src/components/modals/DriverPerformanceModal.tsx](src/components/modals/DriverPerformanceModal.tsx) - Modal for driver performance details.
- [src/components/modals/send-to-workshop.tsx](src/components/modals/send-to-workshop.tsx) - Workflow modal for sending an item or vehicle to workshop.
- [src/components/modals/subcontractors.tsx](src/components/modals/subcontractors.tsx) - Subcontractor selection or management modal.

## Inventory and Finance

### `src/components/inventory/`

- [src/components/inventory/StockEntryModal.tsx](src/components/inventory/StockEntryModal.tsx) - Modal for creating or editing a stock entry.

### `src/components/inv/components/`

- [src/components/inv/components/Overview.tsx](src/components/inv/components/Overview.tsx) - Inventory overview dashboard.
- [src/components/inv/components/StockLedger.js](src/components/inv/components/StockLedger.js) - Stock ledger report.
- [src/components/inv/components/StockBalance.js](src/components/inv/components/StockBalance.js) - Stock balance report.
- [src/components/inv/components/SerialNumberReport.js](src/components/inv/components/SerialNumberReport.js) - Serial number report.
- [src/components/inv/components/Jobs.js](src/components/inv/components/Jobs.js) - Inventory jobs view.
- [src/components/inv/components/invoice.jsx](src/components/inv/components/invoice.jsx) - Invoice view.
- [src/components/inv/components/invoice-report.jsx](src/components/inv/components/invoice-report.jsx) - Invoice report view.
- [src/components/inv/components/GoodsReceivedVoucher.js](src/components/inv/components/GoodsReceivedVoucher.js) - GRV document view.
- [src/components/inv/components/due-report.jsx](src/components/inv/components/due-report.jsx) - Due report view.
- [src/components/inv/components/account-stock-dialogue.tsx](src/components/inv/components/account-stock-dialogue.tsx) - Stock dialogue for account-linked inventory flows.
- [src/components/inv/components/parts-selection-dialogue.tsx](src/components/inv/components/parts-selection-dialogue.tsx) - Parts selection dialogue.
- [src/components/inv/components/purchase-management-dialogue.tsx](src/components/inv/components/purchase-management-dialogue.tsx) - Purchase management dialogue.
- [src/components/inv/components/Header.js](src/components/inv/components/Header.js) - Inventory module header.
- [src/components/inv/components/Sidebar.js](src/components/inv/components/Sidebar.js) - Inventory module sidebar.

## Accounts Module

These components make up the internal accounts or ERP-style workspace.

- [src/components/accounts/AccountDashboard.tsx](src/components/accounts/AccountDashboard.tsx) - Main accounts dashboard.
- [src/components/accounts/InternalAccountDashboard.tsx](src/components/accounts/InternalAccountDashboard.tsx) - Internal-only dashboard variant.
- [src/components/accounts/AccountsContent.js](src/components/accounts/AccountsContent.js) - Main content router for the accounts module.
- [src/components/accounts/AccountsClientsSection.tsx](src/components/accounts/AccountsClientsSection.tsx) - Clients subsection inside accounts.
- [src/components/accounts/AccountsTopBar.js](src/components/accounts/AccountsTopBar.js) - Top bar for the accounts workspace.
- [src/components/accounts/Sidebar.js](src/components/accounts/Sidebar.js) - Accounts sidebar navigation.
- [src/components/accounts/Header.js](src/components/accounts/Header.js) - Accounts module header.
- [src/components/accounts/DashboardContent.js](src/components/accounts/DashboardContent.js) - Accounts dashboard content view.
- [src/components/accounts/InventoryContent.js](src/components/accounts/InventoryContent.js) - Accounts inventory subsection.
- [src/components/accounts/JobCard.js](src/components/accounts/JobCard.js) - Job card representation in accounts context.
- [src/components/accounts/JobCardsContent.js](src/components/accounts/JobCardsContent.js) - Job cards list or router.
- [src/components/accounts/OrdersContent.js](src/components/accounts/OrdersContent.js) - Orders subsection.
- [src/components/accounts/PurchasesContent.js](src/components/accounts/PurchasesContent.js) - Purchases subsection.
- [src/components/accounts/ReportsContent.js](src/components/accounts/ReportsContent.js) - Reports subsection.
- [src/components/accounts/SalesContent.js](src/components/accounts/SalesContent.js) - Sales subsection.
- [src/components/accounts/ScheduleContent.js](src/components/accounts/ScheduleContent.js) - Scheduling subsection.
- [src/components/accounts/SettingsContent.js](src/components/accounts/SettingsContent.js) - Settings subsection.
- [src/components/accounts/SetupContent.js](src/components/accounts/SetupContent.js) - Initial setup subsection.
- [src/components/accounts/StockOrderModal.jsx](src/components/accounts/StockOrderModal.jsx) - Modal for placing stock orders.
- [src/components/accounts/CacheStatusIndicator.tsx](src/components/accounts/CacheStatusIndicator.tsx) - Cache health or sync indicator.

## Workshop Module

The workshop folder contains the full job-card and maintenance workflow.

- [src/components/workshop/WorkshopRegistrationForm.tsx](src/components/workshop/WorkshopRegistrationForm.tsx) - Workshop registration entry form.
- [src/components/workshop/WorkshopInfoStep.tsx](src/components/workshop/WorkshopInfoStep.tsx) - Information step in the workshop wizard.
- [src/components/workshop/UpdatedJobCardForm.tsx](src/components/workshop/UpdatedJobCardForm.tsx) - Updated job card editor.
- [src/components/workshop/RejectedJobs.tsx](src/components/workshop/RejectedJobs.tsx) - Rejected jobs list.
- [src/components/workshop/PendingFleetApprovalTab.tsx](src/components/workshop/PendingFleetApprovalTab.tsx) - Pending fleet approvals tab.
- [src/components/workshop/PartsManagement.tsx](src/components/workshop/PartsManagement.tsx) - Parts management view.
- [src/components/workshop/MaintenanceDashboard.tsx](src/components/workshop/MaintenanceDashboard.tsx) - Maintenance dashboard.
- [src/components/workshop/JobStatusHistory.tsx](src/components/workshop/JobStatusHistory.tsx) - Job status audit trail.
- [src/components/workshop/JobCardWorkflow.tsx](src/components/workshop/JobCardWorkflow.tsx) - End-to-end job card workflow.
- [src/components/workshop/JobCardForm.tsx](src/components/workshop/JobCardForm.tsx) - Job card create/edit form.
- [src/components/workshop/InsuranceBankingStep.tsx](src/components/workshop/InsuranceBankingStep.tsx) - Insurance and banking wizard step.
- [src/components/workshop/FleetManagerStep.tsx](src/components/workshop/FleetManagerStep.tsx) - Fleet manager approval step.
- [src/components/workshop/FleetJobsForAdmin.tsx](src/components/workshop/FleetJobsForAdmin.tsx) - Admin fleet jobs list.
- [src/components/workshop/EditJobDialog.tsx](src/components/workshop/EditJobDialog.tsx) - Edit job dialog.
- [src/components/workshop/ContactLocationStep.tsx](src/components/workshop/ContactLocationStep.tsx) - Contact and location step.
- [src/components/workshop/CompletedJobsReport.tsx](src/components/workshop/CompletedJobsReport.tsx) - Completed jobs report.
- [src/components/workshop/AllocateJobToSubcontractor.tsx](src/components/workshop/AllocateJobToSubcontractor.tsx) - Assign a job to a subcontractor.

## Personal UI Module

The `ui-personal` folder contains specialized customer, vehicle, and job-card tools. Most of these are domain-specific screens or dialogs.

- [src/components/ui-personal/account-dashboard.jsx](src/components/ui-personal/account-dashboard.jsx) - Personal account dashboard.
- [src/components/ui-personal/accounts.tsx](src/components/ui-personal/accounts.tsx) - Accounts entry point or shared wrapper.
- [src/components/ui-personal/add-vehicle-form.jsx](src/components/ui-personal/add-vehicle-form.jsx) - Add vehicle form.
- [src/components/ui-personal/approval-workflow.jsx](src/components/ui-personal/approval-workflow.jsx) - Approval flow view.
- [src/components/ui-personal/assign-parts-modal.jsx](src/components/ui-personal/assign-parts-modal.jsx) - Modal for assigning parts.
- [src/components/ui-personal/client-job-cards.jsx](src/components/ui-personal/client-job-cards.jsx) - Job cards for a client account.
- [src/components/ui-personal/client-quote-form.jsx](src/components/ui-personal/client-quote-form.jsx) - Client quote form.
- [src/components/ui-personal/customer-job-cards.jsx](src/components/ui-personal/customer-job-cards.jsx) - Job cards for a customer view.
- [src/components/ui-personal/customer-quote-form.jsx](src/components/ui-personal/customer-quote-form.jsx) - Customer quote form.
- [src/components/ui-personal/de-installation-form.jsx](src/components/ui-personal/de-installation-form.jsx) - De-installation form.
- [src/components/ui-personal/EnhancedCustomerDetails.jsx](src/components/ui-personal/EnhancedCustomerDetails.jsx) - Expanded customer details panel.
- [src/components/ui-personal/global-view.tsx](src/components/ui-personal/global-view.tsx) - Global overview or shared state-driven view.
- [src/components/ui-personal/job-card-printer.jsx](src/components/ui-personal/job-card-printer.jsx) - Printable job card output.
- [src/components/ui-personal/job-card-view-modal.jsx](src/components/ui-personal/job-card-view-modal.jsx) - Modal for viewing a job card.
- [src/components/ui-personal/job-card-workflow.jsx](src/components/ui-personal/job-card-workflow.jsx) - Personal job card workflow.
- [src/components/ui-personal/job-qr-code.jsx](src/components/ui-personal/job-qr-code.jsx) - QR code representation for a job card or job ID.
- [src/components/ui-personal/live-vehicle-map.tsx](src/components/ui-personal/live-vehicle-map.tsx) - Live vehicle map.
- [src/components/ui-personal/new-account-dialog.jsx](src/components/ui-personal/new-account-dialog.jsx) - New account dialog.
- [src/components/ui-personal/new-assign-parts-modal.jsx](src/components/ui-personal/new-assign-parts-modal.jsx) - New parts assignment modal.
- [src/components/ui-personal/photo-capture-modal.tsx](src/components/ui-personal/photo-capture-modal.tsx) - Photo capture modal.
- [src/components/ui-personal/quotation-pop-up.jsx](src/components/ui-personal/quotation-pop-up.jsx) - Quotation popup.
- [src/components/ui-personal/schedule-view.tsx](src/components/ui-personal/schedule-view.tsx) - Schedule timeline or schedule board.
- [src/components/ui-personal/stock-take-history.jsx](src/components/ui-personal/stock-take-history.jsx) - Stock take history view.
- [src/components/ui-personal/vehicle-brand-parts.jsx](src/components/ui-personal/vehicle-brand-parts.jsx) - Brand-specific vehicle parts screen.
- [src/components/ui-personal/vehicle-map-view.tsx](src/components/ui-personal/vehicle-map-view.tsx) - Vehicle map view.
- [src/components/ui-personal/vehicle-verification-form.tsx](src/components/ui-personal/vehicle-verification-form.tsx) - Vehicle verification form.

## Auth and Onboarding

- [src/components/auth/ActionNewLogin.tsx](src/components/auth/ActionNewLogin.tsx) - Login action component used in auth flows.
- [src/components/backupCode/workshopRegister.tsx](src/components/backupCode/workshopRegister.tsx) - Workshop registration backup or alternate onboarding flow.

## Pages

- [src/components/pages/InspectionTemplates.tsx](src/components/pages/InspectionTemplates.tsx) - Inspection template listing and management page.
- [src/components/pages/InspectionEditor.tsx](src/components/pages/InspectionEditor.tsx) - Inspection template editor.

## How to Pick the Right Component

- For app shell and navigation, start with `AppLayout` or `PageContainer`.
- For forms, combine the page form component with the smaller pieces in `src/components/ui/`.
- For route planning, use `RoutePreviewMap` when you already have stored coordinates, then add `RouteOptimizer` when you need a route API response.
- For live fleet tracking, use `DriverLocationMap` or the map components under `src/components/map/`.
- For dashboards, use `StatsCard`, `DashboardHeader`, `DashboardTabs`, and the chart components instead of building new metric blocks from scratch.
- For workshop and inventory workflows, prefer the existing module components because they already match the domain data model and workflow steps.

## Practical Examples

### Route preview

Use `RoutePreviewMap` when you have origin and destination records, optional stop points, and a driver location.

### Trip entry

Use `TripForm` for create/edit trip flows. It already handles reference-data loading, tabbed sections, default values, and Supabase integration.

### Dashboard screen

Use `PageContainer` when the page is driven by global route metadata and a shared table model. Add `StatsCard` and chart components to surface metrics.

### Workshop operations

Use the workshop components as a workflow chain: registration, job card creation, approval, assignment, history, and reporting.
