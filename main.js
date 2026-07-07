const luxNav = document.querySelector(".lux-nav");
const luxMenu = document.querySelector(".lux-menu");

if (luxNav && luxMenu) {
  const setOpen = (open) => {
    luxNav.classList.toggle("open", open);
    luxMenu.setAttribute("aria-expanded", String(open));
    luxMenu.textContent = open ? luxMenu.dataset.open : luxMenu.dataset.closed;
  };

  luxMenu.addEventListener("click", () => {
    setOpen(!luxNav.classList.contains("open"));
  });

  luxNav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => setOpen(false));
  });
}

function initLuxCaviarControls() {
  const controls = document.querySelector("[data-lux-caviar-controls]");
  const grid = document.querySelector("[data-caviar-grid]");
  const items = grid ? Array.from(grid.querySelectorAll("[data-caviar-item]")) : [];

  if (!controls || !grid || !items.length) {
    return;
  }

  const filterButtons = Array.from(controls.querySelectorAll("[data-caviar-filter]"));
  const viewButtons = Array.from(controls.querySelectorAll("[data-caviar-view]"));
  const sortButton = controls.querySelector("[data-caviar-sort]");
  const sortLabel = controls.querySelector("[data-caviar-sort-label]");
  const count = document.querySelector("[data-caviar-count]");

  const activeButtonClasses = ["border-primary", "text-primary", "bg-primary/10"];
  const inactiveButtonClasses = ["border-outline-variant", "text-on-surface-variant"];
  const activeIconClasses = ["text-primary"];
  const inactiveIconClasses = ["text-on-surface-variant"];
  const sortOptions = [
    {
      key: "recommended",
      label: "推荐排列",
      compare: (a, b) => Number(a.dataset.recommendation) - Number(b.dataset.recommendation),
    },
    {
      key: "price-asc",
      label: "价格升序",
      compare: (a, b) => Number(a.dataset.price) - Number(b.dataset.price),
    },
    {
      key: "price-desc",
      label: "价格降序",
      compare: (a, b) => Number(b.dataset.price) - Number(a.dataset.price),
    },
  ];

  let activeFilter = "all";
  let activeView = "grid";
  let activeSortIndex = 0;

  const setPressed = (buttons, activeButton, activeClasses, inactiveClasses) => {
    buttons.forEach((button) => {
      const isActive = button === activeButton;
      button.setAttribute("aria-pressed", String(isActive));
      button.classList.toggle("hover:text-primary", !isActive);
      activeClasses.forEach((className) => button.classList.toggle(className, isActive));
      inactiveClasses.forEach((className) => button.classList.toggle(className, !isActive));
    });
  };

  const applyFilter = () => {
    let visibleCount = 0;

    items.forEach((item) => {
      const matchesFilter = activeFilter === "all" || item.dataset.species === activeFilter;
      item.hidden = !matchesFilter;
      if (matchesFilter) {
        visibleCount += 1;
      }
    });

    if (count) {
      count.textContent = String(visibleCount);
    }
  };

  const applyView = () => {
    grid.classList.toggle("is-list", activeView === "list");
    const activeButton = viewButtons.find((button) => button.dataset.caviarView === activeView);
    setPressed(viewButtons, activeButton, activeIconClasses, inactiveIconClasses);
  };

  const applySort = () => {
    const option = sortOptions[activeSortIndex];
    if (sortButton) {
      sortButton.dataset.caviarSort = option.key;
      sortButton.setAttribute("aria-label", `切换排序方式，当前为${option.label}`);
    }
    if (sortLabel) {
      sortLabel.textContent = option.label;
    }

    items
      .slice()
      .sort(option.compare)
      .forEach((item) => grid.appendChild(item));
  };

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      activeFilter = button.dataset.caviarFilter || "all";
      setPressed(filterButtons, button, activeButtonClasses, inactiveButtonClasses);
      applyFilter();
    });
  });

  viewButtons.forEach((button) => {
    button.addEventListener("click", () => {
      activeView = button.dataset.caviarView || "grid";
      applyView();
    });
  });

  if (sortButton) {
    sortButton.addEventListener("click", () => {
      activeSortIndex = (activeSortIndex + 1) % sortOptions.length;
      applySort();
    });
  }

  applyFilter();
  applyView();
  applySort();
}

initLuxCaviarControls();
