const { PrismaClient } = require("@prisma/client");
const getLoggedInUser = require("./getLoggedInUser");

const prisma = new PrismaClient();

async function getMenus(req, res, user) {
  // when we log in we don't have a token hence we can't get the logged in user that's getting user as argument while logging in
  const loggedInUser = user || (await getLoggedInUser(req, res));

  const role = await prisma.role.findFirst({
    where: {
      id: loggedInUser.roleId,
    },
  });

  const subMenusAssign = await prisma.subMenuAssign.findMany({
    where: {
      roleId: role.id,
    },
  });

  const submenuIds = subMenusAssign.map((item) => item.subMenuId);

  const subMenu = await prisma.subMenu.findMany({
    where: {
      id: {
        in: submenuIds,
      },
    },
  });

  const uniqueSubMenuid = new Set(subMenu.map((item) => item.menuId));

  const menus = await prisma.menu.findMany({
    where: {
      id: {
        in: [...uniqueSubMenuid],
      },
    },
  });

  // Sort the menus by the 'sequence' property
  menus.sort((a, b) => a.sequence - b.sequence);

  const menusWithSubMenuProperty = menus.map((menu) => {
    return { ...menu, subItems: [] };
  });

  menusWithSubMenuProperty.forEach((menu) => {
    // Filter submenus that have matching menuId
    const matchingSubMenus = subMenu.filter((sub) => sub.menuId === menu.id);
    // Push matching submenus into the subMenus array of the menu
    menu.subItems.push(...matchingSubMenus);
  });

  return menusWithSubMenuProperty;
}

module.exports = getMenus;
