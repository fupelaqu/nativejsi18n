/*
|--------------------------------------------------------------------------
| I18n 0.2
| https://github.com/fupelaqu/nativejsi18n
|--------------------------------------------------------------------------
 */

(function($) {

	$.fn.translate = function (lang, params)
	{
        // Traverser tous les noeuds.
        $(this).find('.i18n').each(function() {
			var element = $(this);
	    	var key = element.attr('i18n');
	    	if(key == undefined)
	    	{
	    		key = element.attr('id');
	    	}
	    	if(key !== undefined)
	    	{
	    		element.html(i18n.translate(lang, key, params));
	    	}
        });
			
        return this;
	}

})(jQuery);
