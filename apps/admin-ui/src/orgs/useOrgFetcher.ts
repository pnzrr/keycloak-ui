import { useState } from "react";

import { useAdminClient } from "../context/auth/AdminClient";
import type { OrgRepresentation } from "./routes";
import type { OrgFormSubmission } from "./modals/NewOrgModal";
import type UserRepresentation from "@keycloak/keycloak-admin-client/lib/defs/userRepresentation";
import type GroupRepresentation from "@keycloak/keycloak-admin-client/lib/defs/groupRepresentation";
import type RoleRepresentation from "@keycloak/keycloak-admin-client/lib/defs/roleRepresentation";
import environment from "../environment";
import IdentityProviderRepresentation from "@keycloak/keycloak-admin-client/lib/defs/identityProviderRepresentation";

type MembersOf = UserRepresentation & {
  membership: GroupRepresentation[];
};

type Resp = Response & { error: string; data?: any[] };

export default function useOrgFetcher(realm: string) {
  const { adminClient } = useAdminClient();

  const [orgs] = useState([]);
  const [org, setOrg] = useState<OrgRepresentation | null>();

  const authUrl = environment.authServerUrl;
  const baseUrl = `${authUrl}/realms/${realm}`;

  async function fetchGet(url: string) {
    const token = await adminClient.getAccessToken();
    return await fetch(url, {
      method: "GET",
      mode: "cors",
      cache: "no-cache",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      redirect: "follow",
    });
  }

  async function fetchModify(url: string, body: any, verb: "POST" | "PUT") {
    const token = await adminClient.getAccessToken();
    return await fetch(url, {
      method: verb,
      mode: "cors",
      cache: "no-cache",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
      redirect: "follow",
    });
  }

  /*
  async function fetchPostForm(url: string, data: FormData) {
    const token = await adminClient.getAccessToken();
    return await fetch(url, {
      method: "POST",
      mode: "cors",
      cache: "no-cache",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Bearer ${token}`,
      },
      body: data,
      redirect: "follow",
    });
  }
  */

  async function fetchPostRaw(url: string, data: string) {
    const token = await adminClient.getAccessToken();
    return await fetch(url, {
      method: "POST",
      mode: "cors",
      cache: "no-cache",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Bearer ${token}`,
      },
      body: data,
      redirect: "follow",
    });
  }

  async function fetchDelete(url: string) {
    const token = await adminClient.getAccessToken();
    return await fetch(url, {
      method: "DELETE",
      mode: "cors",
      cache: "no-cache",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      redirect: "follow",
    });
  }

  async function fetchPost(url: string, body: any) {
    return await fetchModify(url, body, "POST");
  }
  async function fetchPut(url: string, body: any) {
    return await fetchModify(url, body, "PUT");
  }

  async function refreshOrgs() {
    const resp = await fetchGet(`${baseUrl}/orgs`);
    return await resp.json();
  }

  async function createOrg(org: OrgFormSubmission) {
    let resp = (await fetchPost(`${baseUrl}/orgs`, {
      id: org.name,
      ...org,
      realm,
    })) as Resp;

    // successful response is just an empty 201
    if (resp.ok) {
      return { success: true, message: "Org created successfully." };
    }

    resp = await resp.json();
    // @ts-ignore
    const error = resp.error;
    return { error: true, message: error };
  }

  async function getOrg(orgId: string) {
    const resp = await fetchGet(`${baseUrl}/orgs/${orgId}`);
    setOrg(await resp.json());
  }

  async function updateOrg(org: OrgRepresentation) {
    const resp = await fetchPut(`${baseUrl}/orgs/${org.id}`, {
      ...org,
    });
    if (resp.ok) {
      setOrg(org);
      return { success: true, message: "Organization updated." };
    }
    return { error: true, message: await resp.text() };
  }

  async function deleteOrg(org: OrgRepresentation) {
    let resp = (await fetchDelete(`${baseUrl}/orgs/${org.id}`)) as Resp;
    if (resp.ok) {
      return { success: true, message: "Organziation removed." };
    }
    resp = await resp.json();
    return {
      error: true,
      // @ts-ignore
      message: `${org.name} could not be removed. (${resp.error})`,
    };
  }

  async function getOrgMembers(orgId: string): Promise<MembersOf[]> {
    const resp = await fetchGet(`${baseUrl}/orgs/${orgId}/members`);
    const result = await resp.json();
    return result;
  }

  async function addOrgMember(orgId: string, userId: string) {
    const token = await adminClient.getAccessToken();
    await fetch(`${baseUrl}/orgs/${orgId}/members/${userId}`, {
      method: "PUT",
      mode: "cors",
      cache: "no-cache",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      redirect: "follow",
    });
  }

  async function removeMemberFromOrg(orgId: string, userId: string) {
    await fetchDelete(`${baseUrl}/orgs/${orgId}/members/${userId}`);
  }

  async function createInvitation(
    orgId: string,
    email: string,
    send: boolean,
    redirectUri: string
  ) {
    const token = await adminClient.getAccessToken();
    await fetch(`${baseUrl}/orgs/${orgId}/invitations`, {
      method: "POST",
      mode: "cors",
      cache: "no-cache",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        email: email,
        send: send,
        redirectUri: redirectUri,
      }),
      redirect: "follow",
    });
  }

  async function getOrgInvitations(orgId: string) {
    const resp = await fetchGet(`${baseUrl}/orgs/${orgId}/invitations`);

    if (resp.ok) {
      return await resp.json();
    }
    return [];
  }

  async function deleteOrgInvitation(orgId: string, invitationId: string) {
    await fetchDelete(`${baseUrl}/orgs/${orgId}/invitations/${invitationId}`);
  }

  async function getRolesForOrg(orgId: string) {
    const resp = await fetchGet(`${baseUrl}/orgs/${orgId}/roles`);
    return await resp.json();
  }

  async function getPortalLink(orgId: string, userId: string = "") {
    const body = "userId=" + encodeURIComponent(userId);

    const resp = await fetchPostRaw(
      `${baseUrl}/orgs/${orgId}/portal-link`,
      body
    );

    return await resp.json();
  }

  async function deleteRoleFromOrg(orgId: string, role: RoleRepresentation) {
    let resp = (await fetchDelete(
      `${baseUrl}/orgs/${orgId}/roles/${role.name}`
    )) as Resp;
    if (resp.ok) {
      return {
        success: true,
        message: `${role.name} removed from Organization.`,
      };
    }

    resp = await resp.json();
    return {
      error: true,
      message: resp.error,
    };
  }

  async function createRoleForOrg(orgId: string, role: RoleRepresentation) {
    let resp = (await fetchPost(`${baseUrl}/orgs/${orgId}/roles`, {
      id: "fake-id",
      name: role.name,
      description: role.description || "",
    })) as Resp;

    if (resp.ok) {
      return {
        success: true,
        message: `${role.name} added to Organization.`,
      };
    }

    resp = await resp.json();
    return {
      error: true,
      message: resp.error,
    };
  }

  async function updateRoleForOrg(orgId: string, role: RoleRepresentation) {
    let resp = (await fetchPut(`${baseUrl}/orgs/${orgId}/roles`, role)) as Resp;
    if (resp.ok) {
      return {
        success: true,
        message: `${role.name} updated.`,
      };
    }

    resp = await resp.json();
    return {
      error: true,
      message: resp.error,
    };
  }

  // GET /:realm/orgs/:orgId/roles/:name/users/:userId
  async function checkOrgRoleForUser(
    orgId: string,
    role: RoleRepresentation,
    user: UserRepresentation
  ) {
    let resp = (await fetchGet(
      `${baseUrl}/orgs/${orgId}/roles/${role.name}/users/${user.id}`
    )) as Resp;

    if (resp.ok) {
      return {
        success: true,
        message: `User has role: ${role.name}.`,
      };
    }

    resp = await resp.json();
    return {
      error: true,
      message: resp.error,
    };
  }

  // GET /:realm/users/:userId/orgs/:orgId/roles
  async function listOrgRolesForUser(orgId: string, user: UserRepresentation) {
    const resp = (await fetchGet(
      `${baseUrl}/users/${user.id}/orgs/${orgId}/roles`
    )) as Resp;

    if (resp.ok) {
      return {
        success: true,
        data: await resp.json(),
      };
    }

    return {
      error: true,
      message: await resp.json(),
    };
  }

  // PUT /:realm/orgs/:orgId/roles/:name/users/:userId
  async function setOrgRoleForUser(
    orgId: string,
    role: RoleRepresentation,
    user: UserRepresentation
  ) {
    let resp = (await fetchPut(
      `${baseUrl}/orgs/${orgId}/roles/${role.name}/users/${user.id}`,
      {}
    )) as Resp;

    if (resp.ok) {
      return {
        success: true,
        message: `${role.name} assigned to user.`,
      };
    }

    resp = await resp.json();
    return {
      error: true,
      message: resp.error,
    };
  }

  // DELETE /:realm/orgs/:orgId/roles/:name/users/:userId
  async function revokeOrgRoleForUser(
    orgId: string,
    role: RoleRepresentation,
    user: UserRepresentation
  ) {
    let resp = (await fetchDelete(
      `${baseUrl}/orgs/${orgId}/roles/${role.name}/users/${user.id}`
    )) as Resp;

    if (resp.ok) {
      return {
        success: true,
        message: `${role.name} revoked for user.`,
      };
    }

    resp = await resp.json();
    return {
      error: true,
      message: resp.error,
    };
  }

  // GET /:realm/orgs/:orgId/idps
  async function getIdentityProviders(orgId: string) {
    let resp = (await fetchGet(`${baseUrl}/orgs/${orgId}/idps`)) as Resp;

    if (resp.ok) {
      return {
        success: true,
        data: await resp.json(),
      };
    }

    resp = await resp.json();
    return {
      error: true,
      message: resp.error,
    };
  }

  // PUT /:realm/orgs/:orgId/idps/:alias
  async function updateIdentityProvider(
    orgId: string,
    idp: IdentityProviderRepresentation,
    alias: string
  ) {
    let resp = (await fetchPut(
      `${baseUrl}/orgs/${orgId}/idps/${alias}`,
      idp
    )) as Resp;
    if (resp.ok) {
      return {
        success: true,
        message: `${idp.displayName} updated.`,
      };
    }

    resp = await resp.json();
    return {
      error: true,
      message: resp.error,
    };
  }

  return {
    refreshOrgs,
    orgs,
    getOrgMembers,
    createOrg,
    deleteOrg,
    getOrg,
    updateOrg,
    addOrgMember,
    removeMemberFromOrg,
    getOrgInvitations,
    createInvitation,
    deleteOrgInvitation,
    getRolesForOrg,
    deleteRoleFromOrg,
    createRoleForOrg,
    updateRoleForOrg,
    checkOrgRoleForUser,
    setOrgRoleForUser,
    revokeOrgRoleForUser,
    listOrgRolesForUser,
    getPortalLink,
    getIdentityProviders,
    updateIdentityProvider,
    org,
  };
}
