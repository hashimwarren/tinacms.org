import * as React from 'react'
import { GetStaticProps, GetStaticPaths } from 'next'
import { readFile } from 'utils/readFile'
import { getMarkdownPreviewProps } from 'utils/getMarkdownFile'
import {
  DocsLayout,
  DocsTextWrapper,
  Wrapper,
  MarkdownContent,
  Footer,
} from 'components/layout'
import { NextSeo } from 'next-seo'
import {
  DocsNav,
  DocsPagination,
  Overlay,
  DocsHeaderNav,
  Toc,
} from 'components/ui'
import {
  DocsNavToggle,
  DocsMobileTinaIcon,
  DocsContent,
  DocsGrid,
  DocGridHeader,
  DocsPageTitle,
  DocGridToc,
  DocGridContent,
} from '../../../docs/[...slug]'
import { useRouter } from 'next/router'
import { getGuideNavProps } from 'utils/guide_helpers'
import { useMemo } from 'react'
import { OpenAuthoringSiteForm } from 'components/layout/OpenAuthoringSiteForm'
import { usePlugin, useFormScreenPlugin } from 'tinacms'
import { InlineTextareaField } from 'react-tinacms-inline'
import { useGithubMarkdownForm, useGithubJsonForm } from 'react-tinacms-github'
import { InlineWysiwyg } from 'components/inline-wysiwyg'
import { getJsonPreviewProps } from 'utils/getJsonPreviewProps'
import { MarkdownCreatorPlugin } from 'utils/plugins'
import { fileToUrl } from '../../../../utils'

export default function GuideTemplate(props) {
  const [open, setOpen] = React.useState(false)
  const isBrowser = typeof window !== `undefined`
  const contentRef = React.useRef<HTMLDivElement>(null)
  const tocItems = props.tocItems
  console.log(tocItems)
  const [activeIds, setActiveIds] = React.useState([])

  const router = useRouter()
  const currentPath = router.asPath

  const [{ frontmatter, markdownBody }, stepForm] = useGithubMarkdownForm(
    props.markdownFile
  )

  const [guide, guideForm] = useGithubJsonForm(props.guideMeta, {
    label: 'Guide Metadata',
    fields: [
      { component: 'text', name: 'title', label: 'Title' },
      {
        name: 'steps',
        component: 'group-list',
        // @ts-ignore
        itemProps: step => ({
          label: step.title,
        }),
        fields: [
          { component: 'text', name: 'title' },
          { component: 'text', name: 'id' },
          { component: 'text', name: 'slug' },
          { component: 'text', name: 'data' },
        ],
      },
    ],
  })

  usePlugin(
    useMemo(
      () =>
        new MarkdownCreatorPlugin({
          label: 'Step',
          fields: [
            { name: 'title', label: 'Title', component: 'text' },
            { name: 'slug', label: 'Slug', component: 'text' },
          ],
          filename({ slug }) {
            return `content/guides/nextjs/github/${slug}.md`
          },
          frontmatter({ title }) {
            return { title }
          },
          body() {
            return 'A step in the right direction.'
          },
          async afterCreate(response) {
            let url = fileToUrl(
              response.content.path.split('content')[1],
              'guides'
            )

            guideForm.mutators.push('steps', {
              title: url,
              id: `/guides/${url}`,
              slug: `/guides/${url}`,
              data: `./${url.split('/').slice(-1)[0]}.md`,
            })

            await guideForm.submit()

            window.location.href = `/guides/${url}`
          },
        }),
      []
    )
  )

  React.useEffect(() => {
    if (!isBrowser || !contentRef.current) {
      return
    }

    let lastScrollPosition = 0
    let tick = false
    let throttleInterval = 100
    let headings = []
    let baseOffset = 16
    let htmlElements = contentRef.current.querySelectorAll(
      'h1, h2, h3, h4, h5, h6'
    )

    htmlElements.forEach(function(heading: any) {
      headings.push({
        id: heading.id,
        offset: heading.offsetTop,
        level: heading.tagName,
      })
    })

    const throttledScroll = () => {
      let scrollPos = window.scrollY
      let newActiveIds = []
      let activeHeadingCandidates = headings.filter(heading => {
        return heading.offset - scrollPos < baseOffset
      })
      let activeHeading =
        activeHeadingCandidates.length > 0
          ? activeHeadingCandidates.reduce((prev, current) =>
              prev.offset > current.offset ? prev : current
            )
          : {}

      newActiveIds.push(activeHeading.id)

      if (activeHeading.level != 'H2') {
        let activeHeadingParentCandidates =
          activeHeadingCandidates.length > 0
            ? activeHeadingCandidates.filter(heading => {
                return heading.level == 'H2'
              })
            : []
        let activeHeadingParent =
          activeHeadingParentCandidates.length > 0
            ? activeHeadingParentCandidates.reduce((prev, current) =>
                prev.offset > current.offset ? prev : current
              )
            : {}

        if (activeHeadingParent.id) {
          newActiveIds.push(activeHeadingParent.id)
        }
      }

      setActiveIds(newActiveIds)
    }

    function onScroll() {
      if (!tick) {
        setTimeout(function() {
          throttledScroll()
          tick = false
        }, throttleInterval)
      }
      tick = true
    }

    window.addEventListener('scroll', onScroll)

    return () => window.removeEventListener('scroll', throttledScroll)
  }, [contentRef])

  usePlugin(stepForm)
  useFormScreenPlugin(guideForm)

  const guideTitle = guide?.title || 'TinaCMS Guides'
  const guideNav = useGuideNav(guide, props.allGuides)
  const { prev, next } = usePrevNextSteps(guide, currentPath)
  const excerpt = props.markdownFile.data.excerpt

  return (
    <OpenAuthoringSiteForm
      form={stepForm}
      path={props.markdownFile.fileRelativePath}
      preview={props.preview}
    >
      <DocsLayout isEditing={props.editMode}>
        <NextSeo
          title={frontmatter.title}
          titleTemplate={'%s | TinaCMS Docs'}
          description={excerpt}
          openGraph={{
            title: frontmatter.title,
            description: excerpt,
            images: [
              {
                url:
                  'https://res.cloudinary.com/forestry-demo/image/upload/l_text:tuner-regular.ttf_90_center:' +
                  encodeURIComponent(guideTitle) +
                  ',g_center,x_0,y_50,w_850,c_fit,co_rgb:EC4815/v1581087220/TinaCMS/tinacms-social-empty-docs.png',
                width: 1200,
                height: 628,
                alt: guideTitle,
              },
            ],
          }}
        />
        <DocsNavToggle open={open} onClick={() => setOpen(!open)} />
        <DocsMobileTinaIcon docs />
        <DocsNav open={open} navItems={guideNav} />
        <DocsContent>
          <DocsHeaderNav color={'light'} open={open} />
          <DocsTextWrapper>
            <DocsGrid>
              <DocGridHeader>
                <DocsPageTitle>
                  <InlineTextareaField name="frontmatter.title" />
                </DocsPageTitle>
              </DocGridHeader>
              <DocGridToc>
                <Toc tocItems={tocItems} activeIds={activeIds} />
              </DocGridToc>
              <DocGridContent ref={contentRef}>
                <hr />
                <InlineWysiwyg name="markdownBody">
                  <MarkdownContent escapeHtml={false} content={markdownBody} />
                </InlineWysiwyg>
                <DocsPagination prevPage={prev} nextPage={next} />
              </DocGridContent>
            </DocsGrid>
          </DocsTextWrapper>
          <Footer light editMode={props.editMode} />
        </DocsContent>
        <Overlay open={open} onClick={() => setOpen(false)} />
      </DocsLayout>
    </OpenAuthoringSiteForm>
  )
}

export const getStaticProps: GetStaticProps = async function(ctx) {
  const path = require('path')
  const { category, guide, step } = ctx.params
  const pathToGuide = path.join(
    process.cwd(),
    './content/guides',
    category,
    guide
  )
  const {
    props: { file: guideMeta },
  } = await getJsonPreviewProps(
    `content/guides/${category}/${guide}/meta.json`,
    ctx.preview,
    ctx.previewData
  )

  const {
    props: { preview, file: markdownFile, tocItems },
  } = await getMarkdownPreviewProps(
    `content/guides/${category}/${guide}/${step}.md`,
    ctx.preview,
    ctx.previewData
  )

  return {
    props: {
      preview,
      currentGuide: guideMeta.data,
      guideMeta,
      markdownFile,
      allGuides: await getGuideNavProps(),
      tocItems,
    },
  }
}

export const getStaticPaths: GetStaticPaths = async function() {
  const fg = require('fast-glob')
  const contentDir = './content/'
  const rawPaths = await fg(`${contentDir}/guides/*/*/*.md`)
  const captureUrlParams = /\/guides\/([^\/]+)\/([^\/]+)\/([^\/]+)/
  return {
    paths: rawPaths.map(path => {
      const slug = path.substring(contentDir.length, path.length - 3)
      const [, category, guide, step] = captureUrlParams.exec(slug)
      return {
        params: { category, guide, step },
      }
    }),
    fallback: false,
  }
}

function useGuideNav(guide: any, allGuides: any) {
  return useMemo(() => {
    if (guide) {
      return [
        {
          title: guide.title,
          id: guide.title,
          collapsible: false,
          items: guide.steps,
          returnLink: {
            url: '/guides',
            label: '‹ Back to Guides',
          },
        },
      ]
    } else {
      return allGuides
    }
  }, [guide, allGuides])
}

function usePrevNextSteps(guide: any, currentPath: string) {
  return React.useMemo(() => {
    if (!guide) {
      return { prev: null, next: null }
    }
    let prev = null,
      next = null
    const allSteps = guide.steps
    const currentItemIndex = allSteps.findIndex(
      step => step.slug == currentPath
    )
    if (currentItemIndex >= 0) {
      prev = allSteps[currentItemIndex - 1]

      if (currentItemIndex < allSteps.length - 1) {
        next = allSteps[currentItemIndex + 1]
      }
    }

    return { prev, next }
  }, [guide, currentPath])
}
