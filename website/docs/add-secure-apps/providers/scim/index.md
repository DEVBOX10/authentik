---
title: SCIM Provider
---

SCIM (System for Cross-domain Identity Management) is a set of APIs to provision users and groups. The SCIM provider in authentik supports SCIM 2.0 and can be used to provision and sync users from authentik into other applications.

### Configuration

A SCIM provider requires a base URL and a token. SCIM works via HTTP requests, so authentik must be able to reach the specified endpoint.

When configuring SCIM, you'll get an endpoint and a token from the application that accepts SCIM data. This endpoint usually ends in `/v2`, which corresponds to the SCIM version supported.

The token given by the application will be sent with all outgoing SCIM requests to authenticate them.

:::info
When adding the SCIM provider, you must define the **Backchannel provider using the name of the SCIM provider that you created in authentik. Do NOT add any value in the **Provider** field (doing so will cause the provider to display as an application on the user interface, under **My apps\*\*, which is not supported for SCIM).
:::

### Syncing

Data is synchronized in multiple ways:

- When a user/group is created/modified/deleted, that action is sent to all SCIM providers
- Periodically (once an hour), all SCIM providers are fully synchronized

The actual synchronization process is run in the authentik worker. To allow this process to better to scale, a task is started for each 100 users and groups, so when multiple workers are available the workload will be distributed.

### Attribute mapping

Attribute mapping from authentik to SCIM users is done via property mappings as with other providers. The default mappings for users and groups make some assumptions that should work for most setups, but it is also possible to define custom mappings to add fields.

All selected mappings are applied in the order of their name, and are deeply merged onto the final user data. The final data is then validated against the SCIM schema, and if the data is not valid, the sync is stopped.

### Filtering

By default, service accounts are excluded from being synchronized. This can be configured in the SCIM provider. Additionally, an optional group can be configured to only synchronize the users that are members of the selected group. Changing this group selection does _not_ remove members outside of the group that might have been created previously.

### Supported features

SCIM defines multiple optional features, some of which are supported by the SCIM provider.

- Patch updates

    If the service provider supports patch updates, authentik will use patch requests to add/remove members of groups. For all other updates, such as user updates and other group updates, PUT requests are used.

### Using in conjunction with other providers

A lot of applications support SCIM in conjunction with another SSO protocol like OAuth/OIDC or SAML. With default settings, the unique user IDs in SCIM and other protocols are identical, which should easily allow applications to link users the are provisioned with users that are logging in.

Applications can either match users on a unique ID sent by authentik called `externalId`, by their email or username.

#### OAuth/OIDC

The default provider configuration for the _Subject mode_ option of _Based on the User's hashed ID_ matches the `externalId` that's generated by default. If any other _Subject mode_ is selected, the `externalId` attribute can be customized via SCIM mappings.

#### SAML

The SAML NameID policy _urn:oasis:names:tc:SAML:2.0:nameid-format:persistent_ uses the same unique user identifier as the default `externalId` value used by the SCIM provider. If a SAML application does not send a NameID request, this value is also used as fallback.
