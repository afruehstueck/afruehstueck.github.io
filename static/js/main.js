// jQuery for page scrolling feature
jQuery(document).ready(function(e) {
    e(".scroll").click(function(t) {
        t.preventDefault();
        e("html,body").animate({
            scrollTop: e(this.hash).offset().top
        }, 1e3)
    })

	$('.citation').hide();
    $('.expander').click(function () {
        // .parent() selects the A tag, .next() selects the P tag
        $(this).parent().next().slideToggle(200);
    });
    $('.citation').slideUp(200);
});
