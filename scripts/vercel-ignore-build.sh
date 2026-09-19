#!/usr/bin/env sh
set -eu

project_id="${VERCEL_PROJECT_ID:-}"
ref="${VERCEL_GIT_COMMIT_REF:-}"

WEB_PROJECT="prj_Lym5X8Vru64nF1iuoW57BGTgtLpE"
CLINICAL_PROJECT="prj_XNF5KW6ERqu9zRbxens8Rtwjac5e"
MOBILE_PROJECT="prj_fx6kW7rgDJW9KxTNGgiFMIcKw5Yt"

# Vercel Ignored Build Step semantics:
#   exit 0 => skip this Git deployment
#   exit 1 => continue building
#
# The main web project is the primary project for this repository, so every
# branch keeps its normal preview deployment.
if [ "$project_id" = "$WEB_PROJECT" ]; then
  echo "Vercel routing: build primary web project for ref '${ref:-unknown}'."
  exit 1
fi

# The clinical staging and mobile Vercel projects are linked to the same GitHub
# repository. Building them on every unrelated feature commit multiplied each
# commit into three deployments and exhausted the Hobby rolling deployment
# allowance. They still build on main and on intentionally scoped branches.
if [ "$project_id" = "$CLINICAL_PROJECT" ]; then
  case "$ref" in
    main|clinical/*|staging/*|anham-clinical/*)
      echo "Vercel routing: build clinical staging project for ref '$ref'."
      exit 1
      ;;
    *)
      echo "Vercel routing: skip clinical staging project for unrelated ref '${ref:-unknown}'."
      exit 0
      ;;
  esac
fi

if [ "$project_id" = "$MOBILE_PROJECT" ]; then
  case "$ref" in
    main|mobile/*|anham-mobile/*)
      echo "Vercel routing: build mobile project for ref '$ref'."
      exit 1
      ;;
    *)
      echo "Vercel routing: skip mobile project for unrelated ref '${ref:-unknown}'."
      exit 0
      ;;
  esac
fi

# Unknown/new Vercel projects fail open: do not accidentally suppress a valid
# deployment just because this routing table has not been updated yet.
echo "Vercel routing: unknown project '$project_id'; continue build."
exit 1
