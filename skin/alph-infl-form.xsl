<?xml version="1.0" encoding="UTF-8"?>
<!-- produces table cells to hold the forms in inflection form set -->
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" version="1.0">
    <xsl:import href="alph-infl-extras.xsl"/>
    <xsl:import href="beta-uni-util.xsl"/>
    <xsl:import href="uni2ascii.xsl"/>
    
    <xsl:template name="ending-cell">
        <xsl:param name="infl-endings"/>
        <xsl:param name="selected_endings"/>
        <xsl:param name="selected"/>
        <xsl:param name="translit_ending_table_match" />
        <xsl:param name="strip_greek_vowel_length" />
        <xsl:param name="show_only_matches"/>
        <xsl:param name="context"/>
        
        <td class="ending-group"> <!-- start new cell -->
            <xsl:if test="count($infl-endings/infl-form) = 0">
                <span class="emptycell"
                    context="{translate($context,' ','_')}">&#160;</span>
            </xsl:if>
            <xsl:for-each select="$infl-endings/infl-form">
                <xsl:variable name="stripped-ending">
                    <xsl:choose>
                    <!-- if requested, transliterate the ending in the table for matching -->
                        <xsl:when test="$translit_ending_table_match">
                            <xsl:call-template name="uni-to-ascii">
                                <xsl:with-param name="input" select="."/>
                            </xsl:call-template>
                        </xsl:when>
                        <!-- if we're not transliterating, we may need to   
                            strip greek vowels -->
                        <xsl:when test="$strip_greek_vowel_length = true()">
                            <xsl:call-template name="uni-strip">
                                <xsl:with-param name="input" select="."/>
                                <xsl:with-param name="strip-vowels" select="true()"/>
                                <xsl:with-param name="strip-caps" select="false()"/>
                            </xsl:call-template>                              
                        </xsl:when>
                        <!-- otherwise use the ending as-is -->
                        <xsl:otherwise>
                            <xsl:value-of select="."/>
                        </xsl:otherwise>
                    </xsl:choose>
                </xsl:variable>
                <xsl:variable name="selected_class">
                    <xsl:choose>
                    <!-- if this inflection-set is selected by it's attributes AND
                         the ending matches the one supplied in the template params
                         then add a 'selected' class to the data element -->                                        
                        <xsl:when test="contains($selected,concat(',',$stripped-ending,','))">selected</xsl:when>
                            <!-- otherwise add the class 'matched' to indicate that the ending matches but
                                 the form attributes don't -->
                        <xsl:otherwise>
                            <xsl:choose>
                                <xsl:when test="$strip_greek_vowel_length = true()
                                                and count
                                                ($selected_endings//span
                                                [@class='alph-suff' and 
                                                translate(text(),
                                                $uni-with-length,
                                                $uni-without-length) 
                                                = $stripped-ending]
                                                ) &gt; 0">matched</xsl:when>
                                <xsl:when test="$strip_greek_vowel_length = false()
                                                and count
                                                ($selected_endings//span
                                                [@class='alph-suff' and 
                                                text() = $stripped-ending]
                                                ) &gt; 0">matched</xsl:when>
                            </xsl:choose>  
                        </xsl:otherwise>        
                    </xsl:choose>                                                                                
                </xsl:variable>
                <xsl:choose>
                    <xsl:when test="$show_only_matches and $selected_class=''">
                        <span class="skipending">&#160;</span>                                
                    </xsl:when>
                    <xsl:otherwise>
                        <xsl:variable name="notfirst">
                            <xsl:if test="position() &gt; 1">notfirst</xsl:if>
                        </xsl:variable>
                        <span class="ending primary {$selected_class} {$notfirst}" 
                              stem-class="{@stem-class}"
                              context="{translate($context,' ','_')}">
                            <xsl:value-of select="."/>
                        </span>
                        <xsl:call-template name="add-dialect">
                            <xsl:with-param name="item" select="."/>
                        </xsl:call-template>                        
                        <xsl:call-template name="add-footnote">
                            <xsl:with-param name="item" select="."/>
                        </xsl:call-template>                                
                        </xsl:otherwise>
                </xsl:choose>                                     
            </xsl:for-each>
        </td>
    </xsl:template>
</xsl:stylesheet>