// This is basically an identical set of steps to the discussion tests for
// how-tos and research. Any changes here should be replicated there.

import { UserRole } from 'oa-shared'

import { MOCK_DATA } from '../../data'
import { generateNewUserDetails } from '../../utils/TestUtils'

describe('[News.Discussions]', () => {
  it('shows existing comments', () => {
    const news = MOCK_DATA.news[0]
    cy.visit(`/news/${news.slug}`)
    cy.get(`[data-cy=comment-text]`).contains('First comment')
    cy.get('[data-cy=show-replies]').click()
    cy.get(`[data-cy="ReplyItem"]`).contains('First Reply')
  })

  it('allows authenticated users to contribute to discussions', () => {
    const visitor = generateNewUserDetails()
    const news = MOCK_DATA.news[2]

    const newComment = `An interesting new. The answer must be... ${visitor.username}`
    const updatedNewComment = `An interesting new. The answer must be that when the sky is red, the apocalypse _might_ be on the way. Love, ${visitor.username}`
    const newReply = `Thanks Dave and Ben. What does everyone else think? - ${visitor.username}`
    const updatedNewReply = `Anyone else? Yours truly ${visitor.username}`
    const newsPath = `/news/${news.slug}`

    cy.signUpNewUser(visitor)

    cy.step("Can't add comment with an incomplete profile")
    cy.visit(newsPath)
    cy.get('[data-cy=comments-form]').should('not.exist')
    cy.get('[data-cy=comments-incomplete-profile-prompt]').should('be.visible')

    cy.step('Can add comment when profile is complete')
    cy.completeUserProfile(visitor.username)
    cy.visit(newsPath)
    cy.contains('Start the discussion')
    cy.get('[data-cy=comments-incomplete-profile-prompt]').should('not.exist')
    cy.get('[data-cy=follow-button]').contains('Follow Discussion')
    cy.addComment(newComment)
    cy.contains('1 Comment')
    cy.reload()
    cy.get('[data-cy=follow-button]').contains('Following')

    cy.step('Can edit their comment')
    cy.editDiscussionItem('CommentItem', newComment, updatedNewComment)

    cy.step('Another user can add reply')
    const secondCommentor = generateNewUserDetails()
    cy.logout()
    cy.signUpCompletedUser(secondCommentor)
    cy.visit(newsPath)
    cy.addReply(newReply)
    cy.wait(1000)
    cy.contains('2 Comments')

    cy.step('Can edit their reply')
    cy.editDiscussionItem('ReplyItem', newReply, updatedNewReply)
    cy.step('Another user can leave a reply')
    const secondReply = `Quick reply. ${visitor.username}`

    cy.step('First commentor can respond')
    cy.logout()
    cy.signIn(visitor.email, visitor.password)

    cy.step('Notification generated for reply')
    localStorage.setItem('devSiteRole', UserRole.BETA_TESTER)
    cy.wait(1000)

    cy.get('[data-cy=NotificationsSupabase-desktop]').within(() => {
      cy.get('[data-cy=notifications-new-messages]').click()
    })
    cy.get('[data-cy=NotificationListSupabase]')
    cy.get('[data-cy=NotificationListItemSupabase]')
      .first()
      .within(() => {
        cy.contains(secondCommentor.username)
        cy.contains(news.title)
        cy.contains(updatedNewReply).click()
      })

    cy.get('[data-cy=NotificationsSupabase-desktop]').within(() => {
      cy.get('[data-cy=notifications-new-messages]').click()
    })
    cy.get('[data-cy=NotificationListItemSupabase-unread]').first().click()
    cy.visit(newsPath)
    cy.get('[data-cy=notifications-no-new-messages]')

    cy.step('Can add reply')
    cy.addReply(secondReply)

    cy.step('Can delete their comment')
    cy.deleteDiscussionItem('CommentItem', updatedNewComment)

    cy.step('Replies still show for deleted comments')
    cy.get('[data-cy="deletedComment"]').should('be.visible')
    cy.get('[data-cy=OwnReplyItem]').contains(secondReply)

    cy.step('Can delete their reply')
    cy.deleteDiscussionItem('ReplyItem', secondReply)
  })
})
