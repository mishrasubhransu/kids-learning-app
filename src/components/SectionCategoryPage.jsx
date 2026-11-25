import { useParams, Navigate } from 'react-router-dom';
import CategoryPage from './CategoryPage';
import FilmLesson from './films/FilmLesson';

// One lesson of a multi-lesson home card (Concepts, Science), picked by the
// URL: /concepts/animals → category 'concepts-animals'. Unknown lessons go
// back to the section's menu.
//
// A lesson whose items are all explainer films (Science → Human Body) is a
// film gallery instead of a slide show: /science/body lists the films and
// /science/body/<film> plays one.
const SectionCategoryPage = ({ section, categories, items }) => {
  const { subcategory, '*': rest } = useParams();
  const catInfo = categories.find((c) => c.id === subcategory);

  if (!catInfo || !items[subcategory]) {
    return <Navigate to={`/${section}`} replace />;
  }

  if (items[subcategory].every((item) => item.film)) {
    return (
      <FilmLesson
        section={section}
        catInfo={catInfo}
        items={items[subcategory]}
        slug={rest?.split('/')[0] || null}
      />
    );
  }

  return (
    <CategoryPage
      category={`${section}-${subcategory}`}
      backTo={`/${section}`}
      catInfo={catInfo}
    />
  );
};

export default SectionCategoryPage;
