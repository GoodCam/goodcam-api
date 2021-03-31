# User management API

* [Listing user accounts](#listing-user-accounts)
* [Creating a new user account](#creating-a-new-user-account)
* [Getting user account details](#getting-user-account-details)
* [Changing user settings](#changing-user-settings)
* [Deleting user account](#deleting-user-account)

## Listing user accounts

```text
GET /v1/users/
```

The endpoint returns a list of objects describing particular user accounts. No
authentication is required during the initial setup.

**Response Content-Type:** `application/json`

**User fields:**
* `username`
* `digest_algorithm`: possible values are:
  * `md5`
  * `sha256`

**Possible response codes:**
* `200`
* `401`

**Response example:**
```json
[
    {
        "username": "admin",
        "digest_algorithm": "sha256"
    }
]
```

## Creating a new user account

```text
POST /v1/users/
```

The endpoint can be used for creating new user accounts and for initial setup
of the camera. No authentication is required during the initial setup.

**Request Content-Type:** `application/json`

**Request fields:**
* `username`
* `password`
* `digest_algorithm` (optional): The field is being used only when creating the
  first user account (i.e. the initial setup). It will be silently ignored when
  creating any subsequent user accounts. If omitted during the initial setup,
  `sha256` will be used as the default value. See the possible values above.

**Request example:**
```json
{
    "username": "admin",
    "password": "admin123"
}
```

**Response Content-Type:** `application/json`

**Response fields:**
* `username`
* `digest_algorithm`

**Possible response codes:**
* `201`
* `400`
* `401`

**Response example:**
```json
{
    "username": "admin",
    "digest_algorithm": "sha256"
}
```

## Getting user account details

```text
GET /v1/users/{username}/
```

**Response Content-Type:** `application/json`

**User fields:** see the user fields mentioned above

**Possible response codes:**
* `200`
* `303`
* `401`
* `404`

**Response example:**
```json
{
    "username": "admin",
    "digest_algorithm": "sha256"
}
```

## Changing user settings

```text
PUT /v1/users/{username}/
```

Currently, it's only possible to change the password.

**Request Content-Type:** `application/json`

**Request fields:**
* `password`

**Request example:**
```json
{
    "password": "admin1234"
}
```

**Response Content-Type:** `application/json`

**Response fields:**
* `username`
* `digest_algorithm`

**Possible response codes:**
* `200`
* `303`
* `401`
* `404`

**Response example:**
```json
{
    "username": "admin",
    "digest_algorithm": "sha256"
}
```

## Deleting user account

```text
DELETE /v1/users/{username}/
```

It isn't allowed to delete a user account if it is the only user account.

**Possible response codes:**
* `204`
* `303`
* `400`
* `401`
* `404`
